import os from 'os';
import path from 'path';

// base folder and file paths for certs
export const baseFolder = path.join(os.homedir(), '.exoframe', 'certs');
export const caKeyPath = path.join(baseFolder, 'ca-key.pem');
export const caPath = path.join(baseFolder, 'ca.pem');
export const serverKeyPath = path.join(baseFolder, 'server-key.pem');
export const serverCsrPath = path.join(baseFolder, 'server.csr');
export const extconfPath = path.join(baseFolder, 'extfile.cnf');
export const serverCertPath = path.join(baseFolder, 'server-cert.pem');
