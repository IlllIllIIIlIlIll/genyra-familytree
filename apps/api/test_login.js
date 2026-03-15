
async function testLogin() {
  try {
    const response = await fetch('http://localhost:3001/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nik: '3276011009900001',
        password: 'password123'
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Login successful:', data);
    } else {
      const text = await response.text();
      console.log('Login failed with status:', response.status);
      console.log('Error data:', text);
    }
  } catch (error) {
    console.log('Error message:', error.message);
  }
}

testLogin();
