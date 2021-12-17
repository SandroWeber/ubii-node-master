const selfsigned = require('selfsigned');
const fs = require('fs');
const yargs = require('yargs');

(function () {
  console.warn('WARNING! experimental feature, does not work reliably yet!');

  // command line argument specifications
  const scriptArguments = yargs.usage('Usage: -d <domain>').option('d', {
    alias: 'domain',
    describe: 'domains the certificates should be valid for.',
    type: 'string',
    demandOption: true
  }).argv;

  // define attributes for certificates
  let attrs = [
    { name: 'commonName', value: 'ubii' },
    { name: 'countryName', value: 'DE' },
    { shortName: 'ST', value: 'Bavaria' },
    { name: 'localityName', value: 'Garching' },
    { name: 'organizationName', value: 'TUM-FAR' },
    { shortName: 'OU', value: 'Test' }
  ];

  // define options for certificates

  // create list of alternative names for self-signed options from --domain arguments
  if (!Array.isArray(scriptArguments.domain)) {
    scriptArguments.domain = [scriptArguments.domain];
  }
  let altDomains = [];
  scriptArguments.domain.forEach((element) => {
    altDomains.push({ type: 6 /* URI */, value: element });
  });

  let selfsignedOptions = {
    keySize: 2048,
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
        altNames: altDomains
      }
    ]
  };

  // generate certificates
  let pems = selfsigned.generate(attrs, selfsignedOptions);

  // define path and filenames, make sure path exists
  let pathCertificates = './certificates/';
  let filenameCertificate = 'ubii.cert.pem';
  let filenamePublic = 'ubii.public-key.pem';
  let filenamePrivate = 'ubii.private-key.pem';

  if (!fs.existsSync(pathCertificates)) {
    fs.mkdirSync(pathCertificates);
  }

  // write certificates to file
  try {
    fs.writeFileSync(pathCertificates + filenameCertificate, pems.cert);
    fs.writeFileSync(pathCertificates + filenamePublic, pems.public);
    fs.writeFileSync(pathCertificates + filenamePrivate, pems.private);
    console.info('All files written.');
  } catch (error) {
    console.error(error);
  }
})();
