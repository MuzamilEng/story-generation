(async () => {
    try {
        const res = await fetch('http://localhost:3000/api/user/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'I want to live in Paris and have a dog.' }]
            })
        });
        const data = await res.json();
        console.log("Chat Response:", data);
    } catch (e) {
        console.error(e);
    }
})();
