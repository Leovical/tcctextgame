document.getElementById('command-input').addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
        const command = event.target.value;
        event.target.value = '';

        const response = await fetch('/api/execute-sql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql: command }),
        });

        const data = await response.json();
        console.log(data); 
    }
});