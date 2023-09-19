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

        with open('code/code.py', 'w') as code_file:
            code_file.write(python_code)

        # 执行Python代码
        command = 'python code/code.py'
        result = subprocess.check_output(command, shell=True, stderr=subprocess.STDOUT, universal_newlines=True)

        return jsonify({'result': result.strip()})
    except Exception as e:
        return jsonify({'error': str(e)})

# async def loadPkg():
#     await micropip.install("ssl")
#     from EdgeGPT.EdgeGPT import Chatbot, ConversationStyle

if __name__ == '__main__':
    os.makedirs('code', exist_ok=True)
    app.run(debug=True, port=5000)
    input_ = "Hello, tell me what can you do"
    # response = bingChat(input_)
    # asyncio.run(bingChat(input_))
    # await micropip.install("ssl")
    None