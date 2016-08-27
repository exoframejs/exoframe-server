// npm packages
import fs from 'fs';
import {execSync} from 'child_process';

// our packages
import logger from '../../logger';
import {cert as certConfig} from '../../../config';
import {
  baseFolder,
  caKeyPath,
  caPath,
  serverKeyPath,
  serverCsrPath,
  extconfPath,
  serverCertPath,
} from './paths';

export const generateServerCerts = () => {
  // check if certs already generated
  try {
    fs.statSync(caPath);
    fs.statSync(serverCertPath);
    fs.statSync(serverKeyPath);
    // if yes - just return
    logger.debug('certs already exist!');
    return;
  } catch (e) {
    logger.debug('one or more cert files missing, generating new ones..');
  }

  // create folder if needed
  try {
    fs.mkdirSync(baseFolder);
  } catch (e) {
    logger.debug('could not create folder:', e);
  }

  // First generate CA private and public keys:
  logger.debug('Generate CA private key');
  execSync(`openssl genrsa \
    -aes256 \
    -passout pass:${certConfig.password} \
    -out ${caKeyPath} 4096`);

  // Generate public key
  logger.debug('Generate CA public key');
  execSync(`openssl req \
    -new \
    -x509 \
    -subj '/CN=localhost/O=Company/C=DE' \
    -days ${certConfig.durationDays} \
    -key ${caKeyPath} \
    -passin pass:${certConfig.password} \
    -passout pass:${certConfig.password} \
    -sha256 \
    -out ${caPath}`);

  // Create a server key
  logger.debug('Generate server key');
  execSync(`openssl genrsa \
    -passout pass:${certConfig.password} \
    -out ${serverKeyPath} 4096`);

  // Create certificate signing request (CSR)
  logger.debug('Generate signing request');
  execSync(`openssl req \
    -subj '/CN=${certConfig.host}' \
    -sha256 \
    -new \
    -passin pass:${certConfig.password} \
    -key ${serverKeyPath} \
    -out ${serverCsrPath}`);

  // create extfile.cnf
  logger.debug('Generate extfile.cnf');
  execSync(`echo subjectAltName = IP:${certConfig.ip},IP:127.0.0.1 > ${extconfPath}`);

  // Sign the public key with our CA
  logger.debug('Generate server public key');
  execSync(`openssl x509 \
    -req \
    -days ${certConfig.durationDays} \
    -sha256 \
    -in ${serverCsrPath} \
    -CA ${caPath} \
    -CAkey ${caKeyPath} \
    -CAcreateserial \
    -passin pass:${certConfig.password} \
    -extfile ${extconfPath} \
    -out ${serverCertPath}`);

  // cleanup signing requests
  execSync(`rm ${serverCsrPath}`);

  // change cert permissions
  execSync(`chmod -v 0400 \
    ${caKeyPath} \
    ${serverKeyPath}`);
  execSync(`chmod -v 0444 \
    ${caPath} \
    ${serverCertPath}`);
};
