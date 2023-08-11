from flask import Flask, request, jsonify
import json
import asyncio
from EdgeGPT.EdgeGPT import Chatbot, ConversationStyle
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


async def async_bing(user_input):
    cookies = json.loads(open("bing_cookies_test.json", encoding="utf-8").read())
    bot = await Chatbot.create(cookies=cookies)
    response = await bot.ask(prompt=user_input, conversation_style=ConversationStyle.creative, simplify_response=True)
    print(response)
    await bot.close()  # Close the bot after usage
    return {'output': json.dumps(response, indent=2)}

@app.route('/bing', methods=['POST'])
def bing():
    user_input = request.json.get('data')
    loop = asyncio.get_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(async_bing(user_input))
    response = jsonify(result)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response

if __name__ == '__main__':
    app.run(debug=True)
