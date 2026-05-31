// generate-cert.js - Generate self-signed certificate using node-forge
const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir);
}

console.log('Generating RSA key pair (2048 bits)...');
const keys = forge.pki.rsa.generateKeyPair(2048);

const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'organizationName', value: 'Lyrics Show Dev' }
];

cert.setSubject(attrs);
cert.setIssuer(attrs);

cert.setExtensions([
  { name: 'subjectAltName', altNames: [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' }
  ]}
]);

// Self-sign the certificate
cert.sign(keys.privateKey, forge.md.sha256.create());

// Convert to PEM
const keyPem = forge.pki.privateKeyToPem(keys.privateKey);
const certPem = forge.pki.certificateToPem(cert);

fs.writeFileSync(path.join(certsDir, 'key.pem'), keyPem);
fs.writeFileSync(path.join(certsDir, 'cert.pem'), certPem);

console.log('✅ Certificates generated in ./certs/');
console.log('   - certs/key.pem (private key)');
console.log('   - certs/cert.pem (certificate)');
