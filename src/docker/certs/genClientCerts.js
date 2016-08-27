// npm packages
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
  // Create a client key
  logger.debug('Generate client key');
  const clientKeyPath = path.join(baseFolder, username, 'key.pem');
  execSync(`openssl genrsa -out ${clientKeyPath} 4096`);

  // Create client sign request
  logger.debug('Generate client sign req');
  const clientCsrPath = path.join(baseFolder, username, 'client.csr');
  execSync(`openssl req \
    -subj '/CN=client' \
    -new \
    -key ${clientKeyPath} \
    -out ${clientCsrPath}`);

  // create client conf
  logger.debug('Generate client conf');
  const clientExtfilePath = path.join(baseFolder, username, 'extfile-client.cnf');
  execSync(`echo extendedKeyUsage = clientAuth > ${clientExtfilePath}`);

  // sign public key
  logger.debug('Generate client public key');
  const clientCertPath = path.join(baseFolder, username, 'cert.pem');
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
