///////////////////////////
// Constants & Variables //
///////////////////////////

import {franc, francAll} from 'https://esm.sh/franc@6'

// Dom elements
const messageForm = _get(".message-input-area");
const messageInput = _get(".message-input");
const messageChat = _get(".message-chat");
const messageSendButton = _get("#message-send-button");
const clearChatHistoryButton = _get("#clear-button");
const getProblemDescriptionButton = _get("#problem-input-button")
const userIdButton = _get("#user-id-button")


// Path to the API key file
const apiKeyURL = "API_KEY.txt";
var apiKey = "";

// Icons made by Freepik from www.flaticon.com
const BOT_IMG = "angular.svg";
const PERSON_IMG = "duck.svg";
const BOT_NAME = "GPT-Tutor";
const EDIT_IMG = "pen.svg";

const studentData = { 
  user_id: "waylon", 
  type: "", 
  history: [], 
  problem: "", 
  bing_reply: ""
};

const dbLocalHostUrl = 'http://localhost:8888/';

///////////////
// Functions //
///////////////

/**
 * Get DOM element using selector
 * 
 * @param selector 
 * @param root 
 * @returns DOM element
 */
function _get(selector, root = document) {
  return root.querySelector(selector);
}


/**
 * Fetch the API key from the API_KEY.txt file
 * 
 * @returns {Promise<string>} The API key
 */
async function fetchAPIKey() {
  try {
    const response = await fetch(apiKeyURL);
    if (!response.ok) {
      throw new Error("Failed to fetch API key");
    }
    const apiKey = await response.text();
    return apiKey.trim(); // Remove leading/trailing whitespace
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Ask the student to provide the problem description
*/
async function getProblemDescription() {
  studentData.problem = window.prompt("Enter the problem description:");
  if (studentData.problem !== null && studentData.problem !== "") {
      console.log("User entered:", studentData.problem);

      const promptForBing = `*Instruction*
        Generate: 
        1. Edge cases with respect to each constraint of the problem.
        2. General rules or flow of the problem.
        **Note** 
        1. please do NOT provide any code or snippet of code.
        2. please make your response short and neat.
        *Problem description*\n`
        +studentData.problem;
      // console.log("in getProblemDescription")
      
      // You can perform actions with the entered topic here
      const jsonData = { topic: studentData.problem }; // Create a JSON object
      const jsonBlob = new Blob([JSON.stringify(jsonData)], { type: "application/json" });

      loading_start();

      console.log("call bing~~");
      //provide problem description to bing and ask for edge cases and rules for ChatGPT's reference
      requestBingApi(promptForBing);

      loading_finished();
  }
}


/**
 * Ask the student to provide the user id then retrieve the chat history from the server
 */
async function setUser() {
  const id = window.prompt("Enter your id:");
  if (id !== null) {
    loading_finished()
    studentData.user_id = id
    console.log("Retrieving studentData of student:" + studentData.user_id)

    const chatHis = retrieveChatHistory(id)
    const userProb = retrieveUserProblem(id)
    const bingReply = retrieveUserBingReply(id)
    const promises = [chatHis, userProb, bingReply];
    const response = await Promise.all(promises);
    studentData.history = response[0].data.data;
    studentData.problem = response[1].data.data;
    studentData.bing_reply = response[2].data.data;

    reconstructChatHistory(studentData.history)
    
    console.log("finish retrieving studentData, retrieved studentData:", JSON.stringify(studentData, null, 2))

  }
}


/** 
 * Clear the chat history
 */
function clearChatHistory() {
  messageChat.innerHTML = ''; // Clear the chat interface
  studentData.history = [];
  UpdateChatHistoryToDB();
}


/**
 * Implement the flow of the chatbot, and generate a response from GPT-Tutor to the student's question
 */
async function getTutorResponse(msgText, from_modified) {
  console.log("in getTutorResponse")
  loading_start()
  // const msgText = messageInput.value;
  if (!msgText) return;

  if(studentData.problem == "") {
    window.alert("Please provide your problem description.");
    return;
  }
  
  // Get question's type
  const questionType = await getQuestionType(msgText)
  console.log("questionType: " + questionType)

  var tutorInstruction = "";

  // 針對不同type使用不同prompt
  if (questionType == "U") {
    //undesired output
    tutorInstruction = `*Instruction*
  The goal is to provide a hint to help the student diagnose why their code is producing an undesired output with the input provided by the student. Below are the detailed steps you need to follow:
  1. Ask the student about the intention of the code they provide if the student didn't say it in the question. e.g. "Can you explain how you think your code should work? "
  2. You can ask the student to add \`print(...)\` in the code and specify the position and what to print. Or you can provide test cases which are different from those provided by the student, and then ask the student to run the code for you to help debug.
  3. After those, pose thought-provoking questions, and list out any potential pitfalls or logical errors that might be causing the unexpected output.
  4. The problem that can be fixed with less code or is easier to fix should be addressed first.`;
  } else if (questionType == "H") {
    //hint
    tutorInstruction = `*Instruction*
  Provide hints for the student to solve their problem, and below are the steps you must follow:
  1. Explain the thing that the student is asking with easy-to-understand language and examples if possible.
  2. List out 3 different strategies including what algorithm, data structure … to use, then provide pros and cons for each one of them for the student's reference.
  3. Choose one strategy listed above, then give a neat general idea for example.
  4. Remind the student to take care of some potential pitfalls.
  5. List out the keywords for coding knowledge that may be applied to the student's question or this coding problem.`;
  } else if (questionType == "C") {
    //compile error
    tutorInstruction = `*Instruction*
  The goal is to provide a hint to help the student diagnose why their code is having a compile error. Below are the detailed steps you need to follow:
  1. Explain the error message provided by the compiler.
  2. Review syntax, variable names, and data types, and if that's the reason causing the compile error, tell the student to check for it with questions.
  3. Pose thought-provoking questions, and list out any potential pitfalls or logical errors that might be causing the compile error.`;
  } else if (questionType == "N") {
    //no AC
    tutorInstruction = `*Instruction*
  Provide a hint to help the student optimize their code and address issues causing it not to get accepted on the online judge. Below are the detailed steps you need to follow:
  1. If there's a time limit exceeded (TLE), then assume the logic of the code is correct and provide hints to help the student optimize the efficiency of the code, and then skip the below steps.
  2. If there's no TLE, then for each small part of the code provided by the student. Imagine different scenarios that might cause it to fail on the online judge. Consider the logic, edge cases, and potential bottlenecks in the algorithm.
  3. Encourage the student to review the problem requirements and trace the code to ensure it meets those requirements.
  4. You can ask the student to add \`print(...)\` in the code and specify the position and what to print. Or you can provide test cases which are different from those provided by the student, and then ask the student to run the code for you to help debug.`;
  } else {
    // Universal prompt (default)
  }

  loading_finished()
  var time = formatDate(new Date());
  var user_time;
  if(!from_modified) user_time = appendMessage(studentData.user_id, PERSON_IMG, "right", msgText, time);

  messageInput.value = "";
  try {
    const response = await requestChatGptApi(msgText, tutorInstruction);
    // var ai_time = tutorResponse(response);

    addToHistory("user" ,msgText ,user_time);
    addToHistory("assistant" ,response ,formatDate(new Date()));
  } catch (error) {
    // Handle any errors that occur during the GPT_api call
    console.error(error);
  }
  // loading_finished();
  UpdateChatHistoryToDB();
} 


/**
 * Send the engineered-prompt to the Chat GPT API and get the response
 * 
 * @param {string} message
 * @param {string} tutorInstruction
 * @returns {Promise<string>} The response from the Chat GPT API
 */
async function requestChatGptApi(message, tutorInstruction = '') {
  const pre = createMessageContainerHTML(BOT_NAME, BOT_IMG, 'left', formatDate(new Date()));

  let fullResponse = '';

  const requestBody = {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: `*Role*
        Behave as a coding tutor with the following qualities:
        - Use structured content and bullet points to enhance clarity.
        - please make your response short and NEAT.
        - Don't give detailed step-by-step guides if they are not asked for.`
      },
      {
        role: 'system',
        content: "!!!DO NOT generate answer code or snippet code to STUDENT'S PROBLEM!!!"
      },
      { role: 'user', content: tutorInstruction },
      { role: 'user', content: studentData.problem },
      { role: 'user', content: studentData.bing_reply },
      ...studentData.history.map(messageObj => ({ role: messageObj.role, content: messageObj.content })),
      { role: 'user', content: 'user problem: '+ studentData.problem + '\n user input: ' + message + "!!!DO NOT generate answer code or snippet code to STUDENT'S PROBLEM!!!"}
    ],
    stream: true,
    // max_tokens: 50,
  };

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify(requestBody),
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', requestOptions);

    if (response.ok) {
      const reader = response.body.getReader();
      let result = await reader.read();

      while (!result.done) {
        const chunk = new TextDecoder().decode(result.value);
        // const jsonResponse = JSON.parse(chunk); // Parse the JSON response

        const lines = chunk.split('\n');
        const parsedLines = lines
          .map((line) => line.replace(/^data: /, "").trim())
          .filter((line) => line !== "" && line !== "[DONE]")
          .map((line) => JSON.parse(line));

          
        // Simulate typing effect for the response
        for (const parsedLine of parsedLines) {
          // console.log("parsedLine: ", parsedLine)
          const { choices } = parsedLine;
          const { delta } = choices[0];
          const finish_reason = choices[0].finish_reason;
          const { content } = delta;

          if (finish_reason === "stop") {
            break;
          }

          for (let i = 0; i < content.length; i++) {
            fullResponse += content[i];
            const htmlResponse = marked.parse(fullResponse);
            pre.innerHTML = `<div class="markdown-block">${htmlResponse}</div>`;
            // console.log("msgerChat.scrollTop: ", msgerChat.scrollTop)
            // console.log("msgerChat.scrollHeight: ", msgerChat.scrollHeight)
            if (messageChat.scrollTop + 600 >= messageChat.scrollHeight) {
              messageChat.scrollTop = messageChat.scrollHeight;
            }
            // await sleep(5); // Adjust typing speed here
          }
          // await sleep(30); // Adjust typing speed here
        }
        
        result = await reader.read();
      }

    } else {
        // Handle the error case
        console.log('Error:', response.statusText);
    }
  } catch (error) {
    // Handle the error case
    console.log('Error:', error);
  } 

  const htmlResponse = marked.parse(fullResponse);
  pre.innerHTML = `<div class="markdown-block">${htmlResponse}</div>`;

  return fullResponse; // Return the full response message
}


// Function to create a sleep/delay for typing effect
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ask ChatGPT to identify the type of the question 
 *  
 * @param {*} message 
 * @param {*} tutorInstruction 
 * @returns 
 */
async function getQuestionType(message){
    
    var typePrompt = 
    `*Instructions*
    - Please tell which type of coding question is the one provided below among:
    - Undesired output (Help student find the underlying problem that produces the undesired output)
    - Hint (Give student good guidance that is thought-provoking, and provide related concepts)
    - Compile error (Help student find bugs in the code and needed knowledge related to the error message)
    - Not getting AC (Help student find the underlying problem that might lead to not passing all the test cases on the online judge system)
    !!!Only contain the first character of the name of that type in your response!!!
    e.g. Question: Why is the code having a compile error? You: C (since it's a compile error)
    Question: Only 9 of 17 test cases are accepted, why? You: N (since it's not getting AC)
    ----
    *Question*`;

    var responseMessage = "";
    const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: "Reply a single charactor" }
        , { role: 'user', content: typePrompt + message }
        ]
    };

    const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + apiKey 
        },
        body: JSON.stringify(requestBody)
    };
    console.log("////////////////////////")
    console.log("requestOptions:\n", requestOptions)
      
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


function createMessageContainerHTML(name, img, side, time) {
  const msgHTML = `
    <div class="message ${side}-message">
    <div class="message-icon">
      <img src="${img}" alt="${name}'s Icon">
    </div>

      <div class="message-bubble">
        <div class="message-info">
          <div class="message-info-name">${name}</div>
          <div class="message-info-time">${time}</div>
        </div>

        <div class="message-text"><pre></pre></div>
      </div>
    </div>
  `;

  messageChat.insertAdjacentHTML("beforeend", msgHTML);
  messageChat.scrollTop += 500;

  const messageContainer = messageChat.lastElementChild;
  const pre = messageContainer.querySelector('.message-text pre');

  if (pre) {
    return pre;
  } else {
    console.error("Failed to create message container");
    return null;
  }
}

/**
 * Append message to the chat window
 * 
 * @param {*} name
 * @param {*} img 
 * @param {*} side 
 * @param {*} text 
 * @param {*} time 
 * @returns 
 */
function appendMessage(name, img, side, text ,time) {
  var time = formatDate(new Date());
  var msgHTML = ''
  if(side == 'right'){
    msgHTML = `
    <div class="message ${side}-message">
    <div class="message-icon">
      <img src="${img}" alt="${name}'s Icon">
    </div>

      <div class="message-bubble">
        <div class="message-info">
          <div class="message-info-name">${name}</div>
          <div class="time-and-edit">
            <div class="message-info-time">${time}</div>
            <img src="${EDIT_IMG}" class="edit-btn">  
          </div>
        </div>
        <div class="message-text"><pre>${text}</pre></div>
      </div>
    </div>
  `;
  }
  else{
    msgHTML = `
      <div class="message ${side}-message">
      <div class="message-icon">
        <img src="${img}" alt="${name}'s Icon">
      </div>
  
        <div class="message-bubble">
          <div class="message-info">
            <div class="message-info-name">${name}</div>
            <div class="message-info-time">${time}</div>
          </div>
          <div class="message-text"><pre>${text}</pre></div>
        </div>
      </div>
    `;
  }
  
  messageChat.insertAdjacentHTML("beforeend", msgHTML);
  messageChat.scrollTop += 500;
  
  if (name == BOT_NAME) {
    const messageContainer = messageChat.lastElementChild;
    const pre = messageContainer.querySelector('.message-text pre');
    const htmlResponse = marked.parse(text);
    pre.innerHTML = `<div class="markdown-block">${htmlResponse}</div>`;
  }

  return time;
}

function modifyMessage(messageElement) {
  // Get the text content of the message
  const messageTextElement = messageElement.querySelector('.message-text pre');
  const currentText = messageTextElement.textContent;

  // Prompt the user to enter a new message
  const newText = window.prompt('Edit the message:', currentText);

  // Update the message text if the user entered something
  if (newText !== null && newText !== "") {
    messageTextElement.textContent = newText;

      // Find all the message elements that are below the modified message
    const messagesBelowModified = Array.from(messageChat.querySelectorAll('.message'))
    .filter((message) => message.offsetTop > messageElement.offsetTop);

    // Remove the messages below the modified message from the DOM
    messagesBelowModified.forEach((message) => {
      messageChat.removeChild(message);
    });

      // Find the index of the modified message in studentData.history
    const modifiedMessageIndex = studentData.history.findIndex((message) => message.content == currentText);

    // Check if the modified message was found
    if (modifiedMessageIndex !== -1) {
      // studentData.history[modifiedMessageIndex].content = newText;

      // Create a new array containing messages above the modified message
      const updatedHistory = studentData.history.slice(0, modifiedMessageIndex);

      // Update studentData.history with the new array
      studentData.history = updatedHistory;
      messageChat.scrollTop = messageChat.scrollHeight;
      getTutorResponse(newText,1)
    }
  }
}



// TODO: unclear what these two function does
function addToHistory(role, content,time) {
    studentData.history.push({ role: role, content: content,time:time });
}


/** 
 * Save the chat history to a JSON file and post it to MongoDB server
*/
function UpdateChatHistoryToDB() {
  // studentData.type = problemType.value;
  const jsonData = JSON.stringify(studentData, null, 2);
  // console.log(JSON.parse(jsonData).user_id)
  // console.log("save chat:")
  postRequest(jsonData);
}


/**
 *  Format the date to a string
 * 
 * @param date 
 * @returns formatted date string
 */
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


/**
 * Show the loading animation
 */
function loading_start(){
  document.querySelector("#loader").style.display = "block";
  messageInput.setAttribute("disabled", "true");
  messageSendButton.setAttribute("disabled", "true");
  console.log("loading...");
}


/**
 * Hide the loading animation
*/
function loading_finished(){
  document.querySelector("#loader").style.display = "none";
  messageInput.removeAttribute("disabled");
  messageSendButton.removeAttribute("disabled");
  console.log("loading end");
}

function distinguish_lan(input){
  const languageCode = franc(input);
  console.log('lan: ' , languageCode); 
  if(languageCode=='cmn') return 1;
  return 0;
}

/** 
 * Send the problem description to the Bing API and get the reply
 * 
 * @param {String} input
 */
async function requestBingApi(input) {  
  await fetch('http://127.0.0.1:5000/bing', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
      },
      body: JSON.stringify({bingInput: input})
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network error');
    }
    return response.text();
  })
  .then(data => {
    console.log("bing reply: \n" + JSON.parse(data).bingOutput.text)
    studentData.bing_reply = JSON.parse(data).bingOutput.text
  })
  .catch(error => {
    console.error('There was a problem with the Fetch operation:', error);
  });
  
  // return true;
}

/**
 * Get the problem description from the server
 * 
 * @param {String} id
 */
async function retrieveUserProblem(id) {
  studentData.history = [];
  const payload = {
    user_id: id,
  };

  const headers = {
    'Content-Type': 'application/json'
  };
  
  try {
    const response = axios.post(dbLocalHostUrl + "user_problem", payload, { headers });
    return response;
  } catch (error) {
    console.error('Error getting problem description from db:', error);
  }
}

/**
 * Get the bing reply from the server
 * 
 * @param {String} id
 */
async function retrieveUserBingReply(id) {
  studentData.history = [];
  const payload = {
    user_id: id,
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    const response = axios.post(dbLocalHostUrl + "user_bing_reply", payload, { headers });
    return response;
  } catch (error) {
    console.error('Error getting bing reply from db:', error);
  }
}

/**
 * Get the chat history from the server
 * 
 * @param {String} id 
 */
async function retrieveChatHistory(id) {
  messageChat.innerHTML = ''; // Clear the chat interface
  studentData.history = [];
  const payload = {
    user_id: id,
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    const response = axios.post(dbLocalHostUrl + "user_history", payload, { headers });
    return response;
  } catch (error) {
    console.error('Error getting chat history from db:', error);
  }
}

function reconstructChatHistory(chatHistory) {
  try {
    if (chatHistory.length > 0) {
      messageChat.innerHTML = ''; // Clear the chat interface
      studentData.history = [];

      for (const item of chatHistory) {
        const role = item.role;
        const content = item.content;
        const time = item.time;

        if (role == "assistant" || role == "system") {
          appendMessage(BOT_NAME, BOT_IMG, "left", content, time);
        } else {
          appendMessage(studentData.user_id, PERSON_IMG, "right", content, time);
        }
        addToHistory(role, content, time);
      }
    }
  } catch (error) {
    console.error('Error reconstructing chat history:', error);
  }
}




/**
 * Post a json file to the server 
 *  
 * @param jsonData 
 */
function postRequest(jsonData) {
  console.log("POST:", JSON.parse(jsonData));
  const payload = {
    user_id: JSON.parse(jsonData).user_id,
    type: JSON.parse(jsonData).type,
    chats: JSON.parse(jsonData).history,
    problem: JSON.parse(jsonData).problem,
    bing_reply: JSON.parse(jsonData).bing_reply
  };

  const headers = {
    'Content-Type': 'application/json'
  };

  axios
    .post(dbLocalHostUrl, payload, { headers })
    .then(response => {
      console.log(response.data);
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

/////////////////////
// Event listeners //
/////////////////////

getProblemDescriptionButton.addEventListener("click", async () => {
  await getProblemDescription();
  postRequest(JSON.stringify(studentData, null, 2));
});

userIdButton.addEventListener("click", setUser);

clearChatHistoryButton.addEventListener("click", clearChatHistory);

messageSendButton.addEventListener("click", (event) => {
  event.preventDefault();
  messageChat.scrollTop = messageChat.scrollHeight;
  getTutorResponse(messageInput.value,0)
});

messageInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    event.preventDefault()
    messageSendButton.click();
  }
})

window.addEventListener("load", async () => {
  apiKey = await fetchAPIKey();
  await setUser();
  loading_finished();
});

messageChat.addEventListener("click", (event) => {
  if (event.target.classList.contains('edit-btn')) {
    const messageElement = event.target.closest('.message'); // Find the parent message container
    modifyMessage(messageElement);
  }
});