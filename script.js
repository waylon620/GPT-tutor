const msgerForm = get(".msger-inputarea");
const msgerInput = get(".msger-input");
const msgerChat = get(".msger-chat");
const problem_type = document.getElementById("problem_type");

var history = []; //record the history

var full_history = [];

document.getElementById("downloadBtn").addEventListener("click", () => {
  saveHistoryToJson();
});

document.getElementById("clearBtn").addEventListener("click", () => {
  msgerChat.innerHTML = ''; // Clear the chat interface
  history = []; // Clear the history
  full_history = [];
});

// Icons made by Freepik from www.flaticon.com
const BOT_IMG = "angular.svg";
const PERSON_IMG = "duck.svg";
const BOT_NAME = "BOT";
const PERSON_NAME = "User";

msgerForm.addEventListener("submit", event => {
    event.preventDefault();
    
    const msgText = msgerInput.value;
    if (!msgText) return;

    var user_time = appendMessage(PERSON_NAME, PERSON_IMG, "right", msgText);
    const response = GPT_api(msgText, user_time);
    //   botResponse(response);
    msgerInput.value = "";

});

async function GPT_api(message, user_time){
    const type = problem_type.value;
    console.log(type);
    var responseMessage = "";
    // console.log(message);
    const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: 'You are a helpful assistant.' }, ...history, { role: 'user', content: message }]
    };
    // console.log(requestBody.messages);
    const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer '
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
    var ai_time = botResponse(responseMessage);
    addToFull_History(message, user_time, responseMessage, ai_time);
    console.log(full_history);
    return responseMessage;
}

function appendMessage(name, img, side, text) {
  //   Simple solution for small apps
  var time = formatDate(new Date());
  const msgHTML = `
    <div class="msg ${side}-msg">
      <div class="msg-img" style="background-image: url(${img})"></div>

      <div class="msg-bubble">
        <div class="msg-info">
          <div class="msg-info-name">${name}</div>
          <div class="msg-info-time">${time}</div>
        </div>

        <div class="msg-text"><pre>${text}</pre></div>
      </div>
    </div>
  `;

  msgerChat.insertAdjacentHTML("beforeend", msgHTML);
  msgerChat.scrollTop += 500;

  return time;
}

function botResponse(response) {
    var ai_time = appendMessage(BOT_NAME, BOT_IMG, "left", response);

    // setTimeout(() => {
    //     appendMessage(BOT_NAME, BOT_IMG, "left", responseMessage);
    // }, delay);
    return ai_time;
}

function addToHistory(input, response) {
    history.push({ role: 'user', content: input });
    history.push({ role: 'assistant', content: response });
}

function addToFull_History(input, time, response, ai_time) {
    full_history.push({ role: 'user', content: input, time: time});
    full_history.push({ role: 'assistant', content: response, time : ai_time });
}

const data = { user_id: "user_id", type: problem_type.value, history: full_history };

// Function to save history to a JSON file
function saveHistoryToJson() {
  data.type = problem_type.value;
  data.history = full_history;
  const jsonData = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonData], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  // Create a link element to download the JSON file
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = "chat_history.json";
  document.body.appendChild(downloadLink);
  
  // Click the link to trigger the download
  downloadLink.click();
  
  // Remove the link element
  document.body.removeChild(downloadLink);
}


// Utils
function get(selector, root = document) {
  return root.querySelector(selector);
}

function formatDate(date) {
  const y = date.getFullYear();
  const mo = "0" + (date.getMonth() + 1);
  const d = "0" + date.getDate();
  const h = "0" + date.getHours();
  const m = "0" + date.getMinutes();

  const formattedDate = `${y}-${mo.slice(-2)}-${d.slice(-2)}`;
  const formattedTime = `${h.slice(-2)}:${m.slice(-2)}`;

  return `${formattedDate} ${formattedTime}`;
}

function random(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

window.onload = onPageLoad;
function onPageLoad() {
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