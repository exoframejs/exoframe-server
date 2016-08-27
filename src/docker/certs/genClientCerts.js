// npm packages
import fs from 'fs';
import path from 'path';
import {execSync} from 'child_process';

// our packages
import logger from '../../logger';
import {cert as certConfig} from '../../../config';
import {
  baseFolder,
  caPath,
  caKeyPath,
} from './paths';

export const generateClientCert = (username) => {
  const userFolder = path.join(baseFolder, username);
  const clientCertPath = path.join(userFolder, 'cert.pem');
  const clientKeyPath = path.join(userFolder, 'key.pem');

  // check if certs already generated
  try {
    fs.statSync(clientCertPath);
    fs.statSync(clientKeyPath);
    // if yes - just return
    logger.debug('certs already exist!');
    return;
  } catch (e) {
    logger.debug('one or more cert files missing, generating new ones..');
  }

  // create folder if needed
  try {
    fs.mkdirSync(userFolder);
  } catch (e) {
    logger.debug('could not create folder:', e);
  }

  // Create a client key
  logger.debug('Generate client key');
  execSync(`openssl genrsa -out ${clientKeyPath} 4096`);

  // Create client sign request
  logger.debug('Generate client sign req');
  const clientCsrPath = path.join(userFolder, 'client.csr');
  execSync(`openssl req \
    -subj '/CN=client' \
    -new \
    -key ${clientKeyPath} \
    -out ${clientCsrPath}`);

  // create client conf
  logger.debug('Generate client conf');
  const clientExtfilePath = path.join(userFolder, 'extfile-client.cnf');
  execSync(`echo extendedKeyUsage = clientAuth > ${clientExtfilePath}`);

  // sign public key
  logger.debug('Generate client public key');
  execSync(`openssl x509 \
    -req \
    -days 365 \
    -sha256 \
    -in ${clientCsrPath} \
    -passin pass:${certConfig.password} \
    -CA ${caPath} \
    -CAkey ${caKeyPath} \
    -CAcreateserial \
    -extfile ${clientExtfilePath} \
    -out ${clientCertPath}`);

  // cleanup
  execSync(`rm ${clientCsrPath}`);

  // change cert permissions
  execSync(`chmod -v 0400 ${clientKeyPath}`);
  execSync(`chmod -v 0444 ${clientCertPath}`);
};
