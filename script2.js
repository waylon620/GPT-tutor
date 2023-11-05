const apiKeyURL = "API_KEY.txt";
var apiKey = "";

export async function get_request_or_question(message){
    var is_question = 0, is_request = 0
    const one_grams = [
        "could",
        "may",
        "should",
        "would",
        "can",
        "will",
        "have",
        "do",
        "does",
        "is",
        "are",
    ];
    
    const pronouns = ["you", "he", "she", "it", "i"];
    
    const neg_one_grams = one_grams.map(one_gram => one_gram + "n't");
    const neg_two_grams = neg_one_grams.flatMap(neg_one_gram =>
        pronouns.map(pronoun => neg_one_gram + " " + pronoun)
    );
    
    const two_grams = one_grams.flatMap(one_gram =>
        pronouns.map(pronoun => one_gram + " " + pronoun)
    );
    
    const keywords = [
        "what", "who", "when", "where", "why", "how",
        "is it", "can you", "do you", "are there",
    ];
    
    keywords.push(...two_grams, ...neg_two_grams);
    
    
    const words = message.toLowerCase().split(" ");

    const containsKeyword = keywords.some(keyword => words.join(" ").includes(keyword));

    if (containsKeyword) {
        console.log("句子包含問句");
        is_question = 1;
    } else {
        is_question = 0;
    }
    
    var typePrompt = 
    `*Instructions*
    - Please determine whether the user's input are request sentence or contain a request tone.
        If they are, please response "yes" only, otherwise, if they aren't or you are not sure, please response "no" only.
    - Request sentence may usually include some specific verb, such as "provide", "give", "generate".
    - For example: "please give me the reason why CNN is better than RNN." and you should output "yes"
    - For example: "provide another example." and you should output "yes"
    - For example: "I think the information cannot help." and you should output "no"

    ----
    *Sentence*`;

    var responseMessage = "";
    const requestBody = {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: "Reply 'yes' or 'no' " }
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
    // console.log(responseMessage)
    
    if(responseMessage == "yes") is_request = 1;

    return [is_question,is_request];
}



window.addEventListener("load", async () => {
    apiKey = await fetchAPIKey();
  });


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
  