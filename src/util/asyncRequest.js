import logger from '../logger';

/**
 * Wraps express.js async handler function with catch to correctly handle errors
 * @param  {Function} asyncFn   async handler function for express
 * @param  {Object} req         express request object
 * @param  {Object} res         express response object
 * @return {void}
 */
export const asyncRequest = (asyncFn) => (req, res) =>
  asyncFn(req, res)
  .catch(e => {
    logger.error('Error during async request:', e);
    res.status(500).json({error: e.message});
  });
