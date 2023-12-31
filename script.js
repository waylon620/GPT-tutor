///////////////////////////
// Constants & Variables //
///////////////////////////

import {franc, francAll} from 'https://esm.sh/franc@6'
import { get_request_or_question } from './script2.js';

// Dom elements
const messageForm = _get(".message-input-area");
const messageInput = _get(".message-input");
const messageChat = _get(".message-chat");
const messageSendButton = _get("#message-send-button");
const clearChatHistoryButton = _get("#clear-button");
const getProblemDescriptionButton = _get("#problem-input-button")
const userIdButton = _get("#user-id-button");

let isResizing = false;
var responsed_code = "";
var test_flag = 0
var myCodeMirror
var full_his = []

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

var suggestionBox = null;

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
      appendMessage(BOT_NAME, BOT_IMG, "left", "Great! I have your problem now.\nFeel free to start asking me questions about it.",'');
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
    appendMessage(BOT_NAME, BOT_IMG, "left", "Hi, I'm your coding tutor. To begin, please fill in your problem in the problem box, and feel free to start your chat with me.\n"
    + "For example, you can fill in:\n*Description: Given an integer x, return true if x is a palindrome, and false otherwise.*",'');
    const userProb = retrieveUserProblem(id);
    const bingReply = retrieveUserBingReply(id);
    const promises = [chatHis, userProb, bingReply];
    const response = await Promise.all(promises);
    studentData.history = response[0].data.data;
    studentData.problem = response[1].data.data;
    studentData.bing_reply = response[2].data.data;
    full_his = [];

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
  studentData.problem = "";
  studentData.bing_reply = "";
  studentData.type = "default";
  UpdateChatHistoryToDB();

  full_his = []
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
    loading_finished()
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
    1. If you cannot understand the problem and the student didn't provide his expect output, please tell the sudent to provide his expect ouput.
    2. Pose thought-provoking questions, and list the most potential pitfall or logical error that might cause the unexpected output.
    3. The problem that can be fixed with less code or is easier to fix should be addressed first.`;
  } else if (questionType == "H") {
    //hint
    tutorInstruction = `*Instruction*
    Provide hint for the student to solve their problem, and below are the rules you should follow:
    1. Only provide ONE step that the student should do with easy-to-understand language and make your response short as possible.
    2. Generate next step if the student can understand the current step, otherwise just give easy concept of current step.
    3. Give a neat general idea if the student asked.
    4. List out few keywords for coding knowledge that may be applied to the student's question or this coding problem.
    5. Ask the student if they can understand or provide an easy coding test with "xxx" for student to fill at the end.`;
  } else if (questionType == "C") {
    //compile error
    tutorInstruction = `*Instruction*
    The goal is to provide a hint to help the student diagnose why their code is having a compile error. Below are the detailed steps you need to follow:
    1. Explain the error message provided by the compiler.
    2. Review syntax, variable names, and data types, and if that's the reason causing the compile error, tell the student to check for it with questions.
    3. If the user asks about potential error causes, provide a list of critical pitfalls or logical errors that could be responsible for the compilation error.`;
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
    const [is_qustion, is_request] = await get_request_or_question(msgText)
    if(is_qustion){
      console.log("is question == 1")
      tutorInstruction = `*Instruction*
      The user may still be confused about their problem , please provide assistance gradually.
      Be a kind and patient computer science coding tutor~~~
      `;
    }
    else if(is_request){
      console.log("is request == 1")
      tutorInstruction = `*Instruction*
      The user may want you to provide examples or code. Please be cautious when providing code , you provide only the code stub rather than the entire code.
      Be a kind and patient computer science coding tutor~~~
      `;
    }
    else{
      tutorInstruction = `*Instruction*
      Be a kind and patient computer science coding tutor~~~
      `;
    }

  }

  loading_finished()
  var time = formatDate(new Date());
  var user_time;
  if(!from_modified) user_time = appendMessage(studentData.user_id, PERSON_IMG, "right", msgText, time);

  messageInput.value = "";
  try {
    const response = await requestChatGptApi(msgText, tutorInstruction);
    // var ai_time = tutorResponse(response);

    if(from_modified === 0 || from_modified === 1){
      addToHistory("user" ,msgText ,user_time);
      addToHistory("assistant" ,response ,formatDate(new Date()));
    } 
    if(from_modified === 0 || from_modified === 1 || from_modified === 2){
      addToFullHis("user" ,msgText ,user_time);
      addToFullHis("assistant" ,response ,formatDate(new Date()));
    }

    getSuggestion();
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

  let requestBody = {};

  if(test_flag === 1){
    requestBody = {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `*Role*
          Behave as a coding tutor with the following qualities:
          - Try to separate the question into parts and unsderstand step by step.
          - Use structured content and bullet points to enhance clarity.
          - please make your response short and NEAT.
          - Please provide steps to solve the current issue without giving the complete solution for each step.`
        },
        { role: 'user', content: studentData.problem },
        { role: 'user', content: studentData.bing_reply },
        ...full_his.map(messageObj => ({ role: messageObj.role, content: messageObj.content })),
        {
          role: 'system',
          content: `*Role*
          Behave as a coding tutor with the following qualities:
          - Try to separate the question into parts and unsderstand step by step.
          - Use structured content and bullet points to enhance clarity.
          - please make your response short and NEAT.
          - Please provide steps to solve the current issue without giving the complete solution for each step.`
        },
        { role: 'system', content: tutorInstruction },
        {
          role: 'system',
          content: "!!!You can provide Python stub code, but DO NOT generate answer code to STUDENT'S PROBLEM!!!"
        },
        { role: 'user', content: 'users code: ' + myCodeMirror.getValue() },
        { role: 'user', content: message }
      ],
      stream: true,
      max_tokens: 300,
    };
  }
  else{
    requestBody = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: studentData.problem },
        { role: 'user', content: studentData.bing_reply },
        ...full_his.map(messageObj => ({ role: messageObj.role, content: messageObj.content })),
        {
          role: 'system',
          content: `*Role*
          Behave as a coding tutor with the following qualities:
          - Try to separate the question into parts and unsderstand step by step.
          - Use structured content and bullet points to enhance clarity.
          - please make your response short and NEAT.
          - Please provide steps to solve the current issue without giving the complete solution for each step.`
        },
        { role: 'system', content: tutorInstruction },
        {
          role: 'system',
          content: "!!!You can provide Python stub code, but DO NOT generate whole answer code to STUDENT'S PROBLEM!!!"
        },
        { role: 'user', content: message }
      ],
      stream: true,
      max_tokens: 300,
    };
  }

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
        if (messageChat.scrollTop + 600 >= messageChat.scrollHeight) {
          messageChat.scrollTop = messageChat.scrollHeight;
        }
      }

      const htmlResponse = marked.parse(fullResponse);
      pre.innerHTML = `<div class="markdown-block">${htmlResponse}</div>`;

      const codeBlocks = fullResponse.split('```');
      responsed_code = "";
      for (let i = 0; i < codeBlocks.length; i++) {
        if (i >= 2) { // Check if there are at least 3 code blocks
          responsed_code = codeBlocks[1].replace(/^python|python$/g, "").trim() // Get the code from the third code block
          break;
        }
      }


      if (responsed_code !== "") {
        // Do something with the extracted code
        // console.log("Extracted code:", responsed_code);

        // Create a button element
        const button = document.createElement("button");
        button.setAttribute("id", "test");
        button.setAttribute("class", "test_btn");
        button.textContent = "Open code editor and try !"; // Set the button text

        button.onclick = function() {

            if(!test_flag){
              const middleRow = document.querySelector(".middle-row");
              // Create the form element
              const form = document.createElement("form");
              const submit = document.createElement("button");
              submit.textContent = "Submit";
              submit.className = "code-submit-button";
              submit.addEventListener("click", function() {
                const code = myCodeMirror.getValue();
                const input = document.getElementById("coding-input-area").value; // Get the input from an input field with id "inputField"
            
                // Check if input is provided, and only include it in the JSON payload if it's not empty
                const requestData = { code: code };
                if (input.trim() !== "") {
                  requestData.input = input.trim();
                }
            
                fetch('http://localhost:5000/compilePython', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(requestData),
                })
                .then((response) => response.json())
                .then((data) => {
                  if(data.error){
                    const outputElement = document.getElementById("output");
                    outputElement.textContent =  data.error;
                    getTutorResponse(code+"\n\nI got an error:\n"+data.error,2);
                  }
                  else{
                    const outputElement = document.getElementById("output");
                    outputElement.textContent =  data.result;
                    appendMessage(BOT_NAME, BOT_IMG, "left", "Great! It seems like there is no error in your code, is the output correct?", formatDate(new Date()));
                    addToFullHis('assistant',"Great! It seems like there is no error in your code, is the output correct?",formatDate(new Date()));
                  }
                  console.log(data.error);
                })
                .catch((error) => {
                  console.error('Error:', error);
                });
              });
              form.setAttribute("action", "");
              form.className = "coding-form";

              // Create the textarea element
              const textarea = document.createElement("textarea");
              textarea.setAttribute("id", "editor");
              textarea.setAttribute("class", "editor");

              // Append the textarea and button to the form
              form.appendChild(textarea);

              // Append the form to the middle-row div
              const middleRow_div = document.createElement("div");
              middleRow_div.className = "middle-row-container";
              middleRow_div.appendChild(form);
              
              // add an input area
              const divElement = document.createElement("div");
              divElement.className = "flex-container";
              const inputElement = document.createElement("input");
              inputElement.type = "text";
              inputElement.id = "coding-input-area";
              inputElement.className = "coding-input-area";
              inputElement.classList.add("message-input-area");
              inputElement.placeholder = "Enter your input(optional)...";
              divElement.appendChild(inputElement);
              divElement.appendChild(submit);
              middleRow_div.appendChild(divElement);

              middleRow.appendChild(middleRow_div);

              var el = document.getElementById("editor");
              var codeStart = "# version: Python3\n\n# code start\n\n";
              var initValue = codeStart + responsed_code ;
              myCodeMirror = CodeMirror.fromTextArea(el, {
                  mode: "python", // 语言模式
                  theme: "leetcode", // 主题
                  keyMap: "sublime", // 快键键风格
                  lineNumbers: true, // 显示行号
                  smartIndent: true, // 智能缩进
                  indentUnit: 4, // 智能缩进单位为4个空格长度
                  indentWithTabs: true, // 使用制表符进行智能缩进
                  lineWrapping: true, // 
                  // 在行槽中添加行号显示器、折叠器、语法检测器
                  gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "CodeMirror-lint-markers"], 
                  foldGutter: true, // 启用行槽中的代码折叠
                  autofocus: true, // 自动聚焦
                  matchBrackets: true, // 匹配结束符号，比如"]、}"
                  autoCloseBrackets: true, // 自动闭合符号
                  styleActiveLine: true, // 显示选中行的样式
              });
              // 设置初始文本，这个选项也可以在fromTextArea中配置
              myCodeMirror.setOption("value", initValue);
              // 编辑器按键监听
              myCodeMirror.on("keypress", function() {
                  // 显示智能提示
                  myCodeMirror.showHint();
              });

              const bottomRow = document.querySelector(".bottom-row");
              const outputContainer = document.createElement("div");
              outputContainer.id = "output-container";
              outputContainer.className = "output-container";
              const heading = document.createElement("h2");
              heading.textContent = "Output :";

              // Create a <pre> element for displaying the output
              const outputElement = document.createElement("pre");
              outputElement.id = "output";
              outputContainer.appendChild(heading);
              outputContainer.appendChild(outputElement);

              bottomRow.appendChild(outputContainer);

              test_flag = 1
            }

            else{
              const middleRow = document.querySelector(".middle-row");
              // Get a reference to the child form element
              const middleRow_div = middleRow.querySelector("div");
              const form = middleRow.querySelector("form");
              const ip = middleRow.querySelector("input");
              const submit = middleRow.querySelector("button");

              // Remove the form element from the middle-row
              // middleRow.removeChild(form);
              // middleRow.removeChild(ip);
              // middleRow.removeChild(submit);
              middleRow.removeChild(middleRow_div);

              const bottomRow = document.querySelector(".bottom-row");
              const outputContainer = bottomRow.querySelector("div");
              bottomRow.removeChild(outputContainer)
              
              // middleRow.removeChild();
              test_flag = 0
            }
        };
        
        
        // document.addEventListener("keydown", function(event) {
        //   if (event.shiftKey && event.key === "Enter" && test_flag) {
        //     const code = myCodeMirror.getValue();
        //     const input = document.getElementById("coding-input-area").value; // Get the input from an input field with id "inputField"
        
        //     // Check if input is provided, and only include it in the JSON payload if it's not empty
        //     const requestData = { code: code };
        //     if (input.trim() !== "") {
        //       requestData.input = input.trim();
        //     }
        
        //     fetch('http://localhost:5000/compilePython', {
        //       method: 'POST',
        //       headers: {
        //         'Content-Type': 'application/json',
        //       },
        //       body: JSON.stringify(requestData),
        //     })
        //     .then((response) => response.json())
        //     .then((data) => {
        //       if(data.error){
        //         const outputElement = document.getElementById("output");
        //         outputElement.textContent =  data.error;
        //       }
        //       else{
        //         const outputElement = document.getElementById("output");
        //         outputElement.textContent =  data.result;
        //       }
        //       console.log(data.error);
        //     })
        //     .catch((error) => {
        //       console.error('Error:', error);
        //     });
        //   }
        // });
        
      // Insert the button after the 'pre' element
      pre.insertAdjacentElement("afterend", button);
      } else {
        // Handle the case where there are not enough code blocks
        console.log("Not enough code blocks found.");
      }


    } else {
        // Handle the error case
        console.log('Error:', response.statusText);
    }
  } catch (error) {
    // Handle the error case
    console.log('Error:', error);
  } 

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
    If the user's question is too short or hard to classify, just reply "D" for default.
    !!!Only contain the first character of the name of that type in your response!!!
    e.g. Question: Why is the code having a compile error? You: C (since it's a compile error)
    e.g. Question: Only 9 of 17 test cases are accepted, why? You: N (since it's not getting AC)
    e.g. Question: why I got all threes instead of "1,2,3"? You: U (since it's Undesired output)
    e.g. Question: How to finish the recursion of Hanoi? You: H (since it's Hint)
    e.g. Question: Could you please confirm if the condition within the 'for' loop in my code is correct? You: H (since it's Hint)
    e.g. Question: Thanks! You: D (since it's no obvious type)
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
 * @param {*} side tGptApi
 * @param {*} text 
 * @param {*} time 
 * @returns 
 */
function appendMessage(name, img, side, text ,time) {
  // var time = formatDate(new Date());
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

      full_his = JSON.parse(JSON.stringify(studentData.history));
      getTutorResponse(newText,1)
    }
  }
}



// TODO: unclear what these two function does
function addToHistory(role, content,time) {
    studentData.history.push({ role: role, content: content,time:time });
}

function addToFullHis(role, content,time) {
    full_his.push({ role: role, content: content,time:time });
}
function addToHistory_front(role, content,time) {
   studentData.history.unshift({ role: role, content: content, time: time });
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
      full_his = JSON.parse(JSON.stringify(studentData.history));
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
  // console.log("POST:", JSON.parse(jsonData));
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
  if(messageInput.value!==""){
    messageChat.scrollTop = messageChat.scrollHeight;
    removeSuggestCont();
    getTutorResponse(messageInput.value,0);
  
    // if(test_flag == 1){
    //   const middleRow = document.querySelector(".middle-row");
    //   // Get a reference to the child form element
    //   const middleRow_div = middleRow.querySelector("div");
    //   const form = middleRow.querySelector("form");
    //   const ip = middleRow.querySelector("input");
    //   const submit = middleRow.querySelector("button");
  
    //   // Remove the form element from the middle-row
    //   // middleRow.removeChild(form);
    //   // middleRow.removeChild(ip);
    //   // middleRow.removeChild(submit);
    //   middleRow.removeChild(middleRow_div);
  
    //   const bottomRow = document.querySelector(".bottom-row");
    //   const outputContainer = bottomRow.querySelector("div");
    //   bottomRow.removeChild(outputContainer)
  
    //   test_flag = 0
    // }
  }
  });


messageInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter" && !event.shiftKey) {
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


async function getSuggestion() {

  suggestionBox = createSuggestionContainer();
  // const pre = container.pre
  // const suggestionBox = container.suggestionBox

  // let fullResponse = '';

  const requestBody = {
    model: 'gpt-3.5-turbo',
    messages: [
      // {
      //   role: 'system',
      //   content: `*Role*
      //   Behave as a coding tutor with the following qualities:
      //   - Be inspiring, patient, and professional.
      //   - Use structured content and bullet points to enhance clarity.
      //   - Encourage thought-provoking questions to foster insight.
      //   - Don't give too detailed step-by-step guides if they are not asked for.
      //   - Decide how much information to provide based on the student's level of understanding.`
      // },
      {
        role: 'system',
        content: "!!!DO NOT PROVIDE SOLUTION CODE TO THE STUDENT'S PROBLEM!!!"
      },
      { role: 'user', content: studentData.problem },
      { role: 'user', content: studentData.bing_reply },
      ...studentData.history.map(messageObj => ({ role: messageObj.role, content: messageObj.content })),
      { role: 'user', content: `provide 2 other DIFFERENT low to medium level questions that user might need to know.
      **You only need to provide the questions and IN UNDER 10 WORDS in json object format**, such as: 
      {
        "question1": ...,
        "question2": ...
      }` }
    ]
  };

  const requestOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify(requestBody),
  };

  let resObj;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', requestOptions);
    const fullResponse = await response.json();
    // console.log(fullResponse)
    let originalRes = fullResponse.choices[0].message.content;
    // console.log(originalRes)
    resObj = JSON.parse(originalRes);
    
  } catch (error) {
    // Handle the error case
    console.log('Error:', error);
  } 
  
  let rarr = "&#8594";
  let suggestionHTML = `<div>
  <button class="suggestion-btn suggestion-added" value="${resObj.question1}">
    <inline style="font-size: 17px;">${rarr}</inline> ${resObj.question1}
  </button>
  </div>
  <div>
  <button class="suggestion-btn suggestion-added" value="${resObj.question2}">
    <inline style="font-size: 17px;">${rarr}</inline> ${resObj.question2}
  </button>
  </div>`;

  suggestionBox.innerHTML = suggestionHTML;
  messageChat.scrollTop = messageChat.scrollHeight;
  let suggestionBtns = document.getElementsByClassName("suggestion-btn");
  suggestionBtns[0].addEventListener("click", sendSuggestionQ);
  suggestionBtns[1].addEventListener("click", sendSuggestionQ);
}


function createSuggestionContainer() {
  const msgHTML = `
    <div id="suggestion-container">
      <div id="suggestion-list"></div>
    </div>
  `;

  messageChat.insertAdjacentHTML("beforeend", msgHTML);
  messageChat.scrollTop += 500;

  const messageContainer = messageChat.lastElementChild;
  const suggestionBox = messageContainer.querySelector('#suggestion-list');

  if (suggestionBox) {
    return suggestionBox;
  } else {
    console.error("Failed to create suggestion container");
    return null;
  }
}

function sendSuggestionQ(e){
  messageInput.value = e.target.value;
  removeSuggestCont();
  getTutorResponse(messageInput.value, 3);

}

function removeSuggestCont(){
  let suggestionCont = document.getElementById("suggestion-container");
  let items_ = document.getElementsByClassName("suggestion-btn");
  if(suggestionCont){
    // suggestionCont.classList.add("suggestion-removed");
    // void true;
    // suggestionCont.classList.remove("suggestion-added");
    for (let i=items_.length; i>=1; i--){
      let item = items_[i-1];
      item.classList.add("suggestion-removed");
      void true;
      item.classList.remove("suggestion-added");
      setTimeout(()=>{
          items_[i-1].remove();
      }, 500);
    }
    setTimeout(()=>{
      suggestionCont.remove();
      suggestionCont = null;
      suggestionBox = null;
    }, 500);
  } else{
    console.error("Suggestion Box not found!");
  }
}



