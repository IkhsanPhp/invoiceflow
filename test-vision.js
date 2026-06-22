const urlTags = 'https://ollama.com/api/tags';
const urlChat = 'https://ollama.com/api/chat';
const apiKey = '8f27bd2ca6374a1e91cb5cf398e50563.Tu5P3Cad35JNx79XYegkN_1m';

async function testVisionModels() {
  try {
    const res = await fetch(urlTags, {
      headers: { 'Authorization': 'Bearer ' + apiKey }
    });
    
    const data = await res.json();
    const models = data.models || [];
    
    // Prioritize vision models
    const visionModels = models.filter(m => m.name.toLowerCase().includes('vl') || m.name.toLowerCase().includes('vision') || m.name.toLowerCase().includes('llava'));
    
    const testList = visionModels.length > 0 ? visionModels : models.slice(0, 5);
    console.log("Found " + testList.length + " potential vision models. Testing them...");
    
    const workingModels = [];
    
    for (const m of testList) {
      const modelName = m.name;
      process.stdout.write("Testing " + modelName + "... ");
      
      const chatRes = await fetch(urlChat, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: 'Hi' }],
          stream: false
        })
      });
      
      if (chatRes.ok) {
        console.log('✅ OK');
        workingModels.push(modelName);
      } else {
        const errText = await chatRes.text();
        if (errText.includes('subscription')) {
           console.log('❌ Requires subscription');
        } else {
           console.log('❌ Failed (' + chatRes.status + ')');
        }
      }
    }
    
    console.log('\n--- RESULTS ---');
    console.log('Vision models that work with your API Key:');
    workingModels.forEach(m => console.log('- ' + m));
    
  } catch(e) {
    console.error(e);
  }
}
testVisionModels();
