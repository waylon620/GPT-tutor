const msgerForm = _get(".msger-inputarea");
const msgerInput = _get(".msger-input");
const msgerChat = _get(".msger-chat");
const problem_type = _get("#problem_type");

/**
 * Get DOM element using selector
 * 
 * @param {*} selector 
 * @param {*} root 
 * @returns 
 */
function _get(selector, root = document) {
  return root.querySelector(selector);
}


// Path to the API key file
const apiKeyURL = "API_KEY.txt";
const apiKey = await fetchAPIKey();

/**
 * Fetch the API key from the API_KEY.txt file
 * 
 * @returns {string} The API key
 */
async function fetchAPIKey() {
  try {
    const response = await fetch(apiKeyURL);
    if (!response.ok) {
      throw new Error("Failed to fetch API key");
    }
    const apiKey = await response.text();
    console.log("API key:", apiKey.slice(0, 3));
    return apiKey.trim(); // Remove leading/trailing whitespace
  } catch (error) {
    console.error(error);
    return null;
  }
}

=======
//紀錄使用者與系統對話內容以及時間

var full_history = [];
var topic = "";
document.getElementById("open-input-btn").addEventListener("click", () => {
  topic = window.prompt("Enter the problem description:");
  if (topic !== null) {
      console.log("User entered:", topic);
      // You can perform actions with the entered topic here

      const jsonData = { topic: topic }; // Create a JSON object
      const jsonBlob = new Blob([JSON.stringify(jsonData)], { type: "application/json" });

      // // Create a temporary anchor element to trigger the download
      // const downloadLink = document.createElement("a");
      // downloadLink.href = URL.createObjectURL(jsonBlob);
      // downloadLink.download = "user_problem.json"; // File name
      // downloadLink.click();

      // // Clean up
      // URL.revokeObjectURL(downloadLink.href);
  }
});

document.getElementById("userid-btn").addEventListener("click", () => {
  const id = window.prompt("Enter your id:");
  if (id !== null) {
    data.user_id = id
    getRequest(id)
  }
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  saveHistoryToJson();
});

document.getElementById("bingbtn").addEventListener("click", () => {
  event.preventDefault();
  loading_start();
  console.log("call bing~~");
  sendBing();
  loading_finished();
});

document.getElementById("clearBtn").addEventListener("click", () => {
  msgerChat.innerHTML = ''; // Clear the chat interface
  full_history = [];
});

// Icons made by Freepik from www.flaticon.com
const BOT_IMG = "angular.svg";
const PERSON_IMG = "duck.svg";
const BOT_NAME = "BOT";
const PERSON_NAME = "User";

document.getElementById("chatgptbtn").addEventListener("click", async () => {
  event.preventDefault();
  const msgText = msgerInput.value;
  if (!msgText) return;

  if(topic == "") {
    window.alert("Please provide your problem description.");
    return;
  }

  //get question's type
  var type_prompt = "*Instructions*\n"
    + "- Determine the type of question below among:\n"
    + "  1. Undesired output,\n"
    + "  2. Hint,\n"
    + "  3. Compile error,\n"
    + "  4. Not getting AC.\n"
    + "- Reply with the type without an index.\n\n"
    + "*Question*\nHow to solve this question?\n"

  const type_response = GPT_api(type_prompt + msgText);

  //針對不同type使用不同prompt
  if (type_response == "undesired"){
    const system_message = "*Instruction*" +
    "The goal is to provide a hint to help the student diagnose why their code is producing an undesired output with the input provided by the student. Below are the detailed steps you need to follow:" 
    + "1. Ask the student about the intention of the code they provide if the student didn't say it in the question. e.g. \"Can you explain how you think your code should work? \" "
    + "2. You can ask the student to add `print(...)` in the code and specify the position and what to print. Or you can provide test cases which are different from those provided by the student, and then ask the student to run the code for you to help debug."
    + "3. After those, pose thought-provoking questions, and list out any potential pitfalls or logical errors that might be causing the unexpected output."
    + "4. The problem that can be fixed with less code or is easier to fix should be addressed first."
  }
  else if (type_response == "hint"){
    const system_message = "*Instruction*  Provide hints for the student to solve their problem, and below are the steps you must follow:"
    + "1. Explain the thing that the student is asking with easy-to-understand language and examples if possible."
    + "2. List out 3 different strategies including what algorithm, data structure … to use, then provide pros and cons for each one of them for the student's reference."
    + "3. Choose one strategy listed above, then give a high-level step by step guidance for example."
    + "4. Remind the student to take care of some potential pitfalls."
    + "5. List out the keywords for coding knowledge that may be applied to the student's question or this coding problem."
  }
  else if (type_response == "error"){
    const system_message = "*Instruction*  The goal is to provide a hint to help the student diagnose why their code is having a compile error. Below are the detailed steps you need to follow:"
    + "1. Explain the error message provided by the compiler."
    + "2. Review syntax, variable names, and data types, and if that's the reason causing the compile error, tell the student to check for it with questions."
    + "3. Pose thought-provoking questions, and list out any potential pitfalls or logical errors that might be causing the compile error."
  }
  else if (type_response == "not ac"){
    const system_message = "*Instruction*  Provide a hint to help the student optimize their code and address issues causing it not to get accepted on the online judge. Below are the detailed steps you need to follow:"
    + "1. If there's a time limit exceeded (TLE), then assume the logic of the code is correct and provide hints to help the student optimize the efficiency of the code, and then skip the below steps. "
    + "2. If there's no TLE, then for each small part of the code provided by the student. Imagine different scenarios that might cause it to fail on the online judge. Consider the logic, edge cases, and potential bottlenecks in the algorithm. "
    + "3. Encourage the student to review the problem requirements and trace the code to ensure it meets those requirements."
    + "4. You can ask the student to add `print(...)` in the code and specify the position and what to print. Or you can provide test cases which are different from those provided by the student, and then ask the student to run the code for you to help debug."
  }
  else {}

  // GPT_api(msgText , system_message);

  var time = formatDate(new Date());
  var user_time = appendMessage(PERSON_NAME, PERSON_IMG, "right", msgText, time);

  msgerInput.value = "";
  loading_start();
  try {
    const response = await GPT_api(msgText);
    var ai_time = botResponse(response);
    addToFull_History(msgText, user_time, response, ai_time);
  } catch (error) {
    // Handle any errors that occur during the GPT_api call
    console.error(error);
  }
  loading_finished();
});


async function GPT_api(message, system_message = ''){
    const type = problem_type.value;
    console.log(type);
    var responseMessage = "";
    // console.log(message);
    const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'system', content: "*Role*\nBehave as a coding tutor with the following qualities:\n"
                    + "- Be inspiring, patient, and professional.\n"
                    + "- Use structured content and bullet points to enhance clarity.\n"
                    + "- Avoid providing modified code or direct answers.\n"
                    + "- Encourage thought-provoking questions to foster insight.\n"
                    + "- Foster interactivity with the student."}
                , { role: 'system', content: system_message }
                , { role: 'user', content: "this is my problem description: \n" + topic }
                , ...full_history.map(messageObj => ({ role: messageObj.role, content: messageObj.content }))
                , { role: 'user', content: message }]
    };
    const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey
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
      } else {
        // Handle the error case
        console.log('Error:', response.statusText);
    }
    } catch (error) {
      // Handle the error case
      console.log('Error:', error);
    }

    return responseMessage;
}

function appendMessage(name, img, side, text ,time) {
  //   Simple solution for small apps
  // var time = formatDate(new Date());
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
    var time = formatDate(new Date());
    var ai_time = appendMessage(BOT_NAME, BOT_IMG, "left", response, time);
    console.log("response", response)
    return ai_time;
}

function addToHistory(role, content,time) {
    full_history.push({ role: role, content: content,time:time });
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
  console.log("save chat:")
  console.log(full_history)
  postRequest(jsonData); 
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

function loading_start(){
  document.querySelector("#loader").style.display = "block";
}

function loading_finished(){
  document.querySelector("#loader").style.display = "none";
}

window.onload = onPageLoad;
function onPageLoad() {
  const userId = prompt("Please enter your ID:");
  data.user_id = userId;
  getRequest(data.user_id);
  loading_finished();
}

async function sendBing() {
  const msgText = msgerInput.value;
  if (!msgText) return;
  var user_time = formatDate(new Date());
  appendMessage(PERSON_NAME, PERSON_IMG, "right", msgText, user_time);
  msgerInput.value = "";

  await fetch('http://127.0.0.1:5000/bing', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
      },
      body: JSON.stringify({bingInput: msgText})
      // body: JSON.stringify({bingInput: "Hello, tell me what can you do"})
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network error');
    }
    return response.text();
  })
  .then(data => {
    botResponse(JSON.parse(data).bingOutput.text);
    addToFull_History(msgText, user_time, JSON.parse(data).bingOutput.text, formatDate(new Date()));
    // console.log(data)
  })
  .catch(error => {
    console.error('There was a problem with the Fetch operation:', error);
  });
}


const url = 'http://localhost:8888/';
async function getRequest(id) {
  msgerChat.innerHTML = ''; // Clear the chat interface
  full_history = [];
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
        full_history = [];
        // 循環遍歷每一個元素，進行復原
        for (const item of response.data.data) {
          const role = item.role;
          const content = item.content;
          const time = item.time;
      
          // 使用 role、content、time 進行復原
          // 你可以呼叫你的 appendMessage 函數來顯示訊息
          // 例如：
          if(role == "assistant" || role == "system")  appendMessage(role, BOT_IMG, "left",content, time);
          else appendMessage(role,PERSON_IMG,"right" ,content, time);
          addToHistory(role,content,time);
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

