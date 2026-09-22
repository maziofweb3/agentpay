const fs = require('fs');
const https = require('https');

async function verifyContract() {
  const contractAddress = "0x8aE6aA6200b5B7C0a91e366302A5a6436381c5BC";
  const standardJson = fs.readFileSync('out/AgentPayHybridZap_input.json', 'utf8');

  const params = new URLSearchParams();
  params.append('module', 'contract');
  params.append('action', 'verifysourcecode');
  params.append('contractaddress', contractAddress);
  params.append('contractname', 'src/AgentPayHybridZap.sol:AgentPayHybridZap');
  params.append('compilerversion', 'v0.8.24+commit.e11b9ed9');
  params.append('codeformat', 'solidity-standard-json-input');
  params.append('sourceCode', standardJson);
  params.append('optimizationUsed', '1');
  params.append('runs', '200');
  params.append('evmversion', 'cancun');

  console.log("Submitting standard-json verification to scan.botchain.ai...");

  const postData = params.toString();

  const options = {
    hostname: 'scan.botchain.ai',
    port: 443,
    path: '/api',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/533.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Status Code:', res.statusCode);
      console.log('Response:', data);
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e);
  });

  req.write(postData);
  req.end();
}

verifyContract();
