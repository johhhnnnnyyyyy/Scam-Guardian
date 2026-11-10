// Outcome labels (batch 6): the senior (device credential) and a linked family member (session cookie) can mark each
// warning. Labels are calibration data and never change a live alert.
export const OUTCOMES = [['scam', 'It was a scam'], ['not_scam', 'Not a scam'], ['was_family', 'It was family'], ['unsure', 'Not sure']];
export const outcomeText = Object.fromEntries(OUTCOMES);
export const riskText = event => (event.risk === 'danger' ? 'Hang up now' : event.uncertain ? 'Be careful (close to a scam pattern)' : 'Be careful');
