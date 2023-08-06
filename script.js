const msgerForm = get(".msger-inputarea");
const msgerInput = get(".msger-input");
const msgerChat = get(".msger-chat");
const problem_type = document.getElementById("problem_type");

const history = []; //record the history

const BOT_MSGS = [
  "Hi, how are you?",
  "Ohh... I can't understand what you trying to say. Sorry!",
  "I like to play games... But I don't know how to play!",
  "Sorry if my answers are not relevant. :))",
  "I feel sleepy! :("
];

// Icons made by Freepik from www.flaticon.com
const BOT_IMG = "angular.svg";
const PERSON_IMG = "duck.svg";
const BOT_NAME = "BOT";
const PERSON_NAME = "User";

var isLoadPyScript = false;
var jsPy;
var ready = false;

msgerForm.addEventListener("submit", event => {
    event.preventDefault();
    
      // let msg_ = `The sun set over the calm ocean as birds flew gracefully through the colorful sky.
      //   oceanocean
      //   oceanoceanoceanoceanocean
      //   ocean

      //   def transform_string(input_string):
      //   length = len(input_string)

      //   if length % 2 == 1:  # Odd length
      //       input_string = input_string.capitalize()
      //       transformed_string = input_string[::-1]
      //   else:  # Even length
      //       middle_index = length // 2 - 1

      //   gracefullygracefully`
      // let msg_2 = `print('asdasfs')`
  
      // console.log(jsPy(msg_2), "_____", `${msg_2}`);
      

    const msgText = msgerInput.value;
    if (!msgText) return;

    appendMessage(PERSON_NAME, PERSON_IMG, "right", msgText);
    const response = GPT_api(msgText);
    // botResponse(response);
    msgerInput.value = "";


});

async function GPT_api(message){
    const type = problem_type.value;
    console.log(type);
    var responseMessage = "";
    console.log(message);
    const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: 'You are a helpful assistant.' }, ...history, { role: 'user', content: message }]
    };
    console.log(requestBody.messages);
    const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer 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'
        },
        body: JSON.stringify(requestBody)
    };
      
    try {
    const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        requestOptions
    );
    
    if (response.ok) {
        const jsonResponse = await response.json();
        responseMessage = jsonResponse.choices[0].message.content.trim();
        // Use the response message as needed
        console.log(responseMessage);
        addToHistory(message, responseMessage);
        
    } else {
        // Handle the error case
        console.log('Error:', response.statusText);
    }
    } catch (error) {
    // Handle the error case
    console.log('Error:', error);
    }
    botResponse(responseMessage);
    return responseMessage;
}

function appendMessage(name, img, side, text) {
  //   Simple solution for small apps
  const msgHTML = `
    <div class="msg ${side}-msg">
      <div class="msg-img" style="background-image: url(${img})"></div>

      <div class="msg-bubble">
        <div class="msg-info">
          <div class="msg-info-name">${name}</div>
          <div class="msg-info-time">${formatDate(new Date())}</div>
        </div>

        <div class="msg-text">
          <pre>${text}</pre>
        </div>
      </div>
    </div>
  `;

  msgerChat.insertAdjacentHTML("beforeend", msgHTML);
  msgerChat.scrollTop += 500;
}

function botResponse(response) {
    const r = random(0, BOT_MSGS.length - 1);
    const msgText = BOT_MSGS[r];
    const delay = msgText.split(" ").length * 100;

    if(jsPy(response)>0){
      console.log("GPT Response Contain Python Code!")
    } else{
      appendMessage(BOT_NAME, BOT_IMG, "left", response);
    }

    // setTimeout(() => {
    //     appendMessage(BOT_NAME, BOT_IMG, "left", responseMessage);
    // }, delay);
}

function addToHistory(input, response) {
    history.push({ role: 'user', content: input });
    history.push({ role: 'assistant', content: response });
}

// Utils
function get(selector, root = document) {
  return root.querySelector(selector);
}

function formatDate(date) {
  const h = "0" + date.getHours();
  const m = "0" + date.getMinutes();

  return `${h.slice(-2)}:${m.slice(-2)}`;
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

window.onload = onPageLoad;
function onPageLoad() {

    //////////////////////////////
    // moved to initGPTPrompt() //
    //////////////////////////////

    // console.log("pre prompt");
    // GPT_api("For the following instructions,please do it step by step: " + 
    //         "As the python coding tutor,you should heip students in learning python with patience." +
    //         "First ask user what is the coding problem the user faced to." +
    //         "Secondly,ask user about the question of the coding problem." +
    //         "There will be 3 types of question:" +
    //         "1.How to solve the coding error?" +
    //         "2.How to solve the coding problem?" +
    //         "3.How to get AC(accepted)" +
    //         "After reading the instrctions,say whether or not you clearly understand the instructions."
    //         );

}






function promptIsCode(val){
  console.log(val>0 ? "Response Contain Code!" : "Response Contain No Code!");
}

function pyScriptLoaded(){
  isLoadPyScript = true;
  console.log(isLoadPyScript);
  setTimeout(() => {
    initPyScript();
  }, 500);
}

function initPyScript(){
  jsPy = pyscript.interpreter.globals.get("checkPrompt");

  ready = true;
  initGPTPrompt();
}

function writeConsole(val){
  console.log(val);
}
// document.getElementById("pyScriptTracker").addEventListener("change", ()=>{
// })
function initGPTPrompt(){
  console.log("pre prompt");
    GPT_api("For the following instructions,please do it step by step: " + 
            "As the python coding tutor,you should heip students in learning python with patience." +
            "First ask user what is the coding problem the user faced to." +
            "Secondly,ask user about the question of the coding problem." +
            "There will be 3 types of question:" +
            "1.How to solve the coding error?" +
            "2.How to solve the coding problem?" +
            "3.How to get AC(accepted)" +
            "After reading the instrctions,say whether or not you clearly understand the instructions."
            );
}