const ChatGpt = async (payload) => {
  const myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');
  myHeaders.append('Authorization', `Bearer ${process.env.OPENAI_API_KEY}`);

  const raw = JSON.stringify(payload);

  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: raw
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', requestOptions);
  if (response.status === 200) {
    const { choices } = await response.json();
    const { message } = choices?.[0] || {};
    return message;
  } else {
    throw new Error('Something went wrong...');
  }
};

export default ChatGpt;
