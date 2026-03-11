const parseResponse = (raw) => {
    let cleanText = raw;

    const progressMatch = cleanText.match(/PROGRESS:\s*(\{[\s\S]*?\})/);
    if (progressMatch) {
            const data = JSON.parse(progressMatch[1]);
            console.log("PROGRESS:", data);
            cleanText = cleanText.replace(progressMatch[0], '');
    }

    const captureRegex = /CAPTURE:\s*(\{[\s\S]*?\})/g;
    let match;
    while ((match = captureRegex.exec(cleanText)) !== null) {
        console.log("CAPTURE JSON:", match[1]);
        const data = JSON.parse(match[1]);
        console.log("CAPTURE PARSED:", data);
    }

    return cleanText.replace(/CAPTURE:\s*\{[\s\S]*?\}/g, '').trim();
}

const raw = `That sounds wonderful! 

CAPTURE: {"label": "Identity", "value": "A writer"}
CAPTURE: {
  "label": "Home",
  "value": "By the sea"
}
PROGRESS: {"pct": 40, "phase": "Identity", "covered": ["start"]}

Let's talk about more things...`;

console.log("CLEAN TEXT:", parseResponse(raw));
