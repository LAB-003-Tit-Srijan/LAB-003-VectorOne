import fetch from 'node-fetch';

async function testAsk() {
  const payload = {
    videoId: 'test-video',
    sessionId: 'test-session',
    question: 'what is this video about?',
    transcript: [
      { text: 'Hello class, today we are talking about vectors and how they work in space.', start: 0, duration: 5 },
      { text: 'A vector has both magnitude and direction.', start: 5, duration: 5 },
      { text: 'We can add two vectors by adding their components.', start: 10, duration: 5 }
    ]
  };

  try {
    const res = await fetch('http://localhost:3001/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testAsk();
