from flask import Flask, request, jsonify
import json
import asyncio
import subprocess
import os
from EdgeGPT.EdgeGPT import Chatbot, ConversationStyle
from flask_cors import CORS
# import js

app = Flask(__name__)
CORS(app)

async def bingChat(userInput):
    cookies = json.loads(open("./bing_cookies_test.json", encoding="utf-8").read())
    bot = await Chatbot.create(cookies=cookies)
    response = await bot.ask(prompt=userInput, conversation_style=ConversationStyle.creative, simplify_response=True)
    print(response)
    print("___________________________________")
    print(json.dumps(response, indent=2))
    await bot.close()  # Close the bot after usage
    return response
    # return {'output': json.dumps(response, indent=2)}

@app.route('/bing', methods=['POST'])
def processInput():
    userInput = request.get_json()
    # loop = asyncio.get_event_loop()
    # asyncio.set_event_loop(loop)
    # result = loop.run_until_complete(async_bing(userInput))
    print(userInput)
    # userInput['test'] = "Hello, tell me what can you do"
    bingResponse = asyncio.run(bingChat(userInput["bingInput"]))
    userInput['bingOutput'] = bingResponse
    print(userInput)
    response = jsonify(userInput)
    # response.headers.add('Access-Control-Allow-Origin', 'http://127.0.0.1:8000')
    return response

@app.route('/compilePython', methods=['POST'])
def compile_python():
    try:
        data = request.get_json()
        python_code = data['code']
        input_data = data.get('input', '')
        with open('code/code.py', 'w') as code_file:
            code_file.write(python_code)

        # 执行Python代码
        command = 'python code/code.py'
        result = subprocess.run(command, input=input_data, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)

        # 检查是否有错误消息
        if result.returncode != 0:
            # Python代码运行出错，返回标准错误流（stderr）中的错误消息
            error_message = result.stderr.strip()
            return jsonify({'error': error_message})
        else:
            # Python代码运行成功，返回标准输出流（stdout）中的结果
            output_result = result.stdout.strip()
            return jsonify({'result': output_result})
    except Exception as e:
        # 捕获其他异常
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    os.makedirs('code', exist_ok=True)
    app.run(debug=True, port=5000)
    input_ = "Hello, tell me what can you do"
    # response = bingChat(input_)
    # asyncio.run(bingChat(input_))
    # await micropip.install("ssl")
    None