const selfsigned = require('selfsigned');
const fs = require('fs');

(function () {
  console.info('WARNING! experimental feature, does not work reliably yet!');

  let pathCertificates = './certificates/';
  let filenameCertificate = 'ubii.cert.pem';
  let filenamePublic = 'ubii.public-key.pem';
  let filenamePrivate = 'ubii.private-key.pem';

  /*if (
    fs.existsSync(pathCertificates + filenameCertificate) &&
    fs.existsSync(pathCertificates + filenamePublic) &&
    fs.existsSync(pathCertificates + filenamePrivate)
  ) {
    console.info('All certification files already exist. Aborting.');
    return;
  }*/

  let selfsigned = require('selfsigned');
  let attrs = [
    { name: 'commonName', value: 'ubii' },
    { name: 'countryName', value: 'DE' },
    { shortName: 'ST', value: 'Bavaria' },
    { name: 'localityName', value: 'Garching' },
    { name: 'organizationName', value: 'TUM-FAR' },
    { shortName: 'OU', value: 'Test' }
  ];

  let options = {
    days: 365,
    extensions: [
      { name: 'basicConstraints', cA: true },
      {
        name: 'keyUsage',
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 6 /* URI */, value: '192.168.178.37' },
          { type: 6 /* URI */, value: '192.168.178.37:12345' },
          { type: 6 /* URI */, value: '192.168.178.39' },
          { type: 6 /* URI */, value: '192.168.178.39:12345' },
          { type: 6 /* URI */, value: '131.159.10.80' },
          { type: 6 /* URI */, value: 'localhost' }
        ]
      }
    ]
  };
  let pems = selfsigned.generate(attrs, options);

  try {
    fs.writeFileSync(pathCertificates + filenameCertificate, pems.cert);
    fs.writeFileSync(pathCertificates + filenamePublic, pems.public);
    fs.writeFileSync(pathCertificates + filenamePrivate, pems.private);
    console.info('All files written.');
  } catch (error) {
    console.info(error);
  }
})();
