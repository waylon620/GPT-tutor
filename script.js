const msgerForm = _get(".msger-inputarea");
const msgerInput = _get(".msger-input");
const msgerChat = _get(".msger-chat");
const problem_type = document.getElementById("problem_type");

// Utils
function _get(selector, root = document) {
  return root.querySelector(selector);
}


var history = []; //record the history

var full_history = [];

document.getElementById("open-input-btn").addEventListener("click", () => {
  const topic = window.prompt("Enter the problem you want to ask:");
  if (topic !== null) {
      console.log("User entered:", topic);
      // You can perform actions with the entered topic here

      const jsonData = { topic: topic }; // Create a JSON object
      const jsonBlob = new Blob([JSON.stringify(jsonData)], { type: "application/json" });

      // Create a temporary anchor element to trigger the download
      const downloadLink = document.createElement("a");
      downloadLink.href = URL.createObjectURL(jsonBlob);
      downloadLink.download = "user_problem.json"; // File name
      downloadLink.click();

      // Clean up
      URL.revokeObjectURL(downloadLink.href);
  }
});

document.getElementById("userid-btn").addEventListener("click", () => {
  const id = window.prompt("Enter your id:");
  if (id !== null) {
      getRequest(id)
  }
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  saveHistoryToJson();
});

document.getElementById("bingbtn").addEventListener("click", async () => {
  event.preventDefault();
  console.log("sendtobing");

  try {
    const response = await fetch('http://127.0.0.1:5000/bing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: msgerInput.value })
    });

    const data = await response.json();
    console.log(data.output);
  } catch (error) {
    console.error('Error:', error);
  }

  // await sendBing();
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

document.getElementById("chatgptbtn").addEventListener("click", () => {
  event.preventDefault();
    
  const msgText = msgerInput.value;
  if (!msgText) return;

  var user_time = appendMessage(PERSON_NAME, PERSON_IMG, "right", msgText);
  const response = GPT_api(msgText, user_time);
  //   botResponse(response);
  msgerInput.value = "";
});

// msgerForm.addEventListener("submit", event => {
//     event.preventDefault();
    
//     const msgText = msgerInput.value;
//     if (!msgText) return;

//     var user_time = appendMessage(PERSON_NAME, PERSON_IMG, "right", msgText);
//     const response = GPT_api(msgText, user_time);
//     //   botResponse(response);
//     msgerInput.value = "";

// });

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

const data = { user_id: "waylon", type: problem_type.value, history: full_history };

// Function to save history to a JSON file
function saveHistoryToJson() {
  data.type = problem_type.value;
  data.history = full_history;
  const jsonData = JSON.stringify(data, null, 2);
  console.log(JSON.parse(jsonData).user_id)
  postRequest(jsonData); 

  // const blob = new Blob([jsonData], { type: "application/json" });
  // const url = URL.createObjectURL(blob);
  
  // // Create a link element to download the JSON file
  // const downloadLink = document.createElement("a");
  // downloadLink.href = url;
  // downloadLink.download = "chat_history.json";
  // document.body.appendChild(downloadLink);
  
  // // Click the link to trigger the download
  // downloadLink.click();
  
  // // Remove the link element
  // document.body.removeChild(downloadLink);
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
  const userId = prompt("Please enter your ID:");
  data.user_id = userId;
  getRequest(data.user_id);
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

async function sendBing() {
  await fetch('http://127.0.0.1:5000/bing', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({data: msgerInput.value})
  })
  .then(response => response.json())
  .then(data => {
      // document.getElementById('result').innerText = data.output;
      console.log(data.output);
  })
  .catch(error => {
      console.error('Error:', error);
  });
}


const url = 'http://localhost:8888/';
async function getRequest(id) {
  const payload = {
    user_id: id,
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  axios
    .post("http://localhost:8888/userhistory", payload, { headers })
    .then(response => {
      console.log(response.data.data);
      console.log(response.data.data.length);
      if(response.data.data.length > 0)
      {
        msgerChat.innerHTML = ''; // Clear the chat interface
        history = []; // Clear the history
        full_history = [];
        // 循環遍歷每一個元素，進行復原
        for (const item of response.data.data) {
          const role = item.role;
          const content = item.content;
          const time = item.time;
      
          // 使用 role、content、time 進行復原
          // 你可以呼叫你的 appendMessage 函數來顯示訊息
          // 例如：
          if(role == "assistant" || role == "system")  appendMessage(role, BOT_IMG, "left",content);
          else appendMessage(role,PERSON_IMG,"right" ,content);
        }
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });

}

function postRequest(jsonData) {
  const payload = {
    user_id: JSON.parse(jsonData).user_id,
    type: JSON.parse(jsonData).type,
    chats: JSON.parse(jsonData).history
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  axios
    .post(url, payload, { headers })
    .then(response => {
      console.log(response.data);
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

