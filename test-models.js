const urlTags = 'https://ollama.com/api/tags';
const urlChat = 'https://ollama.com/api/chat';
const apiKey = '8f27bd2ca6374a1e91cb5cf398e50563.Tu5P3Cad35JNx79XYegkN_1m';

async function testModels() {
  try {
    const res = await fetch(urlTags, {
      headers: { 'Authorization': 'Bearer ' + apiKey }
    });
    
    if (!res.ok) {
      console.error('Failed to fetch tags:', res.status, res.statusText);
      return;
    }
    
    const data = await res.json();
    const models = data.models || [];
    console.log("Found " + models.length + " models. Testing up to 10 of them now...");
    
    const workingModels = [];
    const testList = models.slice(0, 10);
    
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
    console.log('Models that work with your API Key:');
    workingModels.forEach(m => console.log('- ' + m));
    if (workingModels.length === 0) console.log('None of the tested models worked.');
    
  } catch(e) {
    console.error(e);
  }
}
testModels();
