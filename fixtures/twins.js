// Benign "twins": harmless lines built to look like scam lines (roadmap F-19). Written by the same author after the
// rules were tuned, so they are DEVELOPMENT hard negatives, not an independent held-out set. Each twin carries the
// scam family it mirrors (its group) and a twin type, so the held-out split can keep a family and its twins together.
// Types: advice, reported (reported speech), narration (the senior describing events), notice (a genuine notice that
// asks for nothing secret), transfer (non-money transfer that matches transfer/share wording).
const t = (group, type, language, segments) => ({ group, type, language, label: 'benign', segments });

export const twins = [
 t('credential', 'advice', 'en-IN', ['Your bank will never ask for your OTP.', 'Do not share it with anyone.']),
 t('credential', 'advice', 'en-IN', ['Never tell anyone your PIN, not even the bank.']),
 t('credential', 'reported', 'en-IN', ['My neighbour said a caller asked for her OTP, so she hung up.']),
 t('credential', 'notice', 'en-IN', ['This is your bank. Your statement is ready.', 'We will never ask for your PIN.']),
 t('credential', 'narration', 'en-IN', ['I changed my password at the branch yesterday.']),
 t('digital_arrest', 'advice', 'en-IN', ['There is no such thing as digital arrest.', 'Police will never arrest you on a video call.']),
 t('digital_arrest', 'reported', 'en-IN', ['The news said fake CBI officers are calling people.']),
 t('digital_arrest', 'narration', 'en-IN', ['My son is a police officer in Chennai.', 'He visits on Sunday.']),
 t('payment', 'notice', 'en-IN', ['Your electricity bill of 1,200 rupees is due on the 15th.', 'Pay through the official app.']),
 t('payment', 'transfer', 'en-IN', ['Transfer the photos to the new phone.']),
 t('payment', 'transfer', 'en-IN', ['Please send me the file now.']),
 t('payment', 'narration', 'en-IN', ['I paid the milkman 500 rupees this morning.']),
 t('remote', 'transfer', 'en-IN', ['Share your screen in the office meeting at three.']),
 t('remote', 'advice', 'en-IN', ['Do not install apps that a caller asks you to install.']),
 t('remote', 'notice', 'en-IN', ['Your phone has a system update ready to install tonight.']),
 t('courier', 'notice', 'en-IN', ['Your parcel is out for delivery today.', 'The delivery agent will call when he arrives.']),
 t('family_emergency', 'narration', 'en-IN', ['My grandson had a small accident at football.', 'He is fine now.']),
 t('identity', 'notice', 'en-IN', ['Please bring your Aadhaar card to the bank counter for KYC.']),
 t('secrecy', 'narration', 'en-IN', ['Keep this a secret, it is a surprise party for Amma.']),
 t('urgency', 'notice', 'en-IN', ['The train leaves in ten minutes, please hurry.']),
 t('credential', 'advice', 'hi-IN', ['बैंक कभी ओटीपी नहीं माँगता।', 'अपना ओटीपी किसी को मत बताना।']),
 t('digital_arrest', 'advice', 'hi-IN', ['पुलिस वीडियो कॉल पर किसी को गिरफ्तार नहीं करती।']),
 t('payment', 'narration', 'hi-IN', ['मैंने बिजली का बिल भर दिया है।']),
 t('family_emergency', 'narration', 'hi-IN', ['बेटा आज अस्पताल में डॉक्टर से मिलने गया था।']),
 t('payment', 'notice', 'hi-IN', ['आपका पार्सल आज पहुँच जाएगा।']),
 t('credential', 'advice', 'ta-IN', ['வங்கி OTP கேட்காது.', 'யாருடனும் பகிர வேண்டாம்.']),
 t('payment', 'narration', 'ta-IN', ['நான் இன்று பால்காரருக்கு பணம் கொடுத்தேன்.']),
 t('family_emergency', 'narration', 'ta-IN', ['என் மகன் இன்று மருத்துவமனைக்கு வேலைக்குச் சென்றான்.']),
 t('courier', 'notice', 'ta-IN', ['உங்கள் பார்சல் இன்று வரும்.']),
 t('digital_arrest', 'reported', 'ta-IN', ['போலி போலீஸ் அழைப்புகள் பற்றி செய்தியில் சொன்னார்கள்.']),
].map((x, i) => ({ id: `twin-${x.language}-${i + 1}`, ...x }));
