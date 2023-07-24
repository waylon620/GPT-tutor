const mytextInput = document.querySelector('.chat-input');
const chatMessages = document.getElementById('chat-messages');

const API_KEY = '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'; // Replace with your actual OpenAI API key

const user_prompt = new Array(); // Empty array
const history = []; //record the history

// Function to add input and response to the history array
function addToHistory(input, response) {
    history.push({ role: 'user', content: input });
    history.push({ role: 'assistant', content: response });
}

function createMessageElement(content, role) {
    const messageElement = document.createElement('div');
    messageElement.classList.add(`${role}-message`);

    // Create the text box element
    const textBoxElement = document.createElement('div');
    textBoxElement.classList.add('talk-bubble', 'tri-right', 'round');

    const paragraphElement = document.createElement('p');
    paragraphElement.textContent = content;

    textBoxElement.appendChild(paragraphElement);

    // Add the text box element to the message element
    messageElement.appendChild(textBoxElement);

    // Add a CSS class to the AI message for blue text color
    if (role === 'ai') {
        textBoxElement.classList.add('talk-bubble', 'tri-right', 'round', 'left-in', 'left-align');
        
    }
    else{
        textBoxElement.classList.add('talk-bubble', 'tri-right', 'round', 'right-in', 'right-align');

    }
    return messageElement;
}


async function sendMessage(message) {
    // const message = mytextInput.value.trim();
    user_prompt.push(message); // Push user input into the array
    mytextInput.value = '';

    if (user_prompt) {
        mytextInput.disabled = true;

        const loadingCircle = document.getElementById('loading-circle');
        loadingCircle.style.display = 'block';
        
        const userMessageElement = createMessageElement(message, 'user');
        chatMessages.appendChild(userMessageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        console.log("User Input:", message); // Print user input in console
        const requestBody = {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'system', content: 'You are a helpful assistant.' }, ...history, { role: 'user', content: message }]
        };
        console.log(requestBody.messages);
        const requestOptions = {
            method: 'POST',
            mode: 'cors',
            headers: {
              'content-type': 'application/json',
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
            const responseMessage = jsonResponse.choices[0].message.content.trim();
            // Use the response message as needed
            // console.log(responseMessage);
            const aiMessageElement = createMessageElement(responseMessage, 'ai');
            chatMessages.appendChild(aiMessageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            addToHistory(message, responseMessage);

            loadingCircle.style.display = 'none';
            
        } else {
            // Handle the error case
            console.log('Error:', response.statusText);
            loadingCircle.style.display = 'none';
        }
        } catch (error) {
        // Handle the error case
        console.log('Error:', error);
        }
    }
    mytextInput.disabled = false;
}

// Function to enable or disable the chat input
function toggleChatInput(isEnabled) {
    const chatInput = document.getElementById('chat-input');
    chatInput.disabled = !isEnabled;
  }

function handleKeyPress(event) {
  if (event.keyCode === 13) {
    event.preventDefault();
    sendMessage(mytextInput.value.trim());
  }
}

document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
      // Perform your action here
      console.log('Spacebar pressed!');
      mytextInput.focus();
    }
  });

window.onload = function() {
    history.push({ role: 'system', content: "As a programming teacher, your role is to guide and support students in their learning process. You are NOT allowed to provide direct answers to their questions but instead provide advice and guidance. If a student's question indicates a lack of understanding, you can offer hints to steer them in the right direction. Remember, you should only provide advice when the student asks a question. YOU CANNOT DO ANYTHING THATS IS NOT ABOUT CODING" });
    history.push({ role: 'system', content: "If the user provide a problem description,Find the rules behind the problem. Second,rewrite the problem in your word and state clearly about the rules. Please do it step by step." });
    const intro = "Hi, I'm your coding tutor. What can I help you?";
    history.push({ role: 'assistant', content: intro });
    // const aiMessageElement = createMessageElement(intro, 'ai');
    // chatMessages.appendChild(aiMessageElement);
    // chatMessages.scrollTop = chatMessages.scrollHeight;
    // addToHistory(message, responseMessage);
}
  

document.querySelector('.chat-submit').addEventListener('click', sendMessage(mytextInput.value.trim()));
mytextInput.addEventListener('keydown', handleKeyPress);
