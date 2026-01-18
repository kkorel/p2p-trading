import { StepLogger } from '../logger';

const logger = new StepLogger();

const s1 = logger.group(1, 'At Trade Placement');
s1.event('TE', 'Bank', 'request block');
s1.done('placement logged');

const s2 = logger.group(2, 'Bank Blocks Funds');
s2.info('internal: funds moved to block');
s2.done();

const s3 = logger.group(3, 'Block Confirmed');
s3.event('Bank', 'TE', 'confirmation of block');
s3.event('Bank', 'Buyer', 'notification of block confirmation');
s3.done();

const s4 = logger.group(4, 'After Trade Verification');
s4.event('TE', 'Bank', 'release blocked funds to seller');
s4.done();

const s5 = logger.group(5, 'Unblock & Transfer');
s5.info('internal: unblock and transfer processed');
s5.event('Bank', 'Seller', 'credited');
s5.event('Bank', 'Buyer', 'transfer complete');
s5.done('transfer finished');
