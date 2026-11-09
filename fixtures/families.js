// Scam-family development set (batch 3). Synthetic paraphrases from the batch 3 research notes (no real numbers, ids
// or names). Hindi, Hinglish and Tamil lines need native review. Each scam call should reach "Hang up" (danger);
// single core lines in other languages should at least reach "Be careful" (warn). Look-alikes are genuine notices or
// advice that a keyword rule would flag and should stay calm. These are DEVELOPMENT data: the rules are tuned on them.
const scam = (family, language, segments, expect = 'danger') => ({ family, language, label: 'scam', expect, segments });
const benign = (family, language, segments) => ({ family, language, label: 'benign', segments });

export const familyCases = [
 // 1 KYC / account freeze
 scam('kyc', 'en-IN', ["This is your bank's KYC department; your account will be frozen tonight if you don't update.", 'Share the OTP you just got so we can verify your identity and stop the freeze.']),
 scam('kyc', 'en-IN', ['Your KYC has expired and your account will be blocked today.', 'Download this app to complete your KYC; it takes two minutes.']),
 scam('kyc', 'hi-IN', ['Ye aapke bank ka KYC department hai; agar aapne update nahi kiya to aaj raat account freeze ho jayega.'], 'warn'),
 scam('kyc', 'hi-IN', ['जो OTP अभी आया है, वह बताइए ताकि आपकी पहचान की पुष्टि हो और खाता बंद न हो।']),
 scam('kyc', 'ta-IN', ['இப்போது வந்த OTP-ஐ சொல்லுங்கள், உங்கள் அடையாளத்தை சரிபார்த்து கணக்கு முடக்கப்படுவதை தடுக்கலாம்.']),
 benign('kyc', 'en-IN', ["Your KYC is due for renewal; please visit your home branch or use the bank's official app. We will never ask for your OTP."]),
 benign('kyc', 'en-IN', ["Your account will be blocked after 3 failed login attempts; you can unlock it through the app's forgot-password option."]),
 benign('kyc', 'en-IN', ['Use OTP only to confirm a transaction you started. Do not share it with anyone.']),
 // 2 Lottery / KBC
 scam('lottery', 'en-IN', ['Congratulations, your number won the KBC lucky draw of 25 lakh rupees.', 'To release the prize, pay a processing fee of 5,000 rupees.']),
 scam('lottery', 'en-IN', ['You have been selected in the lucky draw.', 'Send your bank details and Aadhaar copy for verification.', 'The offer closes tonight.']),
 scam('lottery', 'hi-IN', ['Prize release ke liye 5,000 rupees processing fee bhejiye.'], 'warn'),
 scam('lottery', 'hi-IN', ['बधाई हो! आपका नंबर KBC लकी ड्रॉ में 25 लाख रुपये जीत गया है।'], 'warn'),
 scam('lottery', 'ta-IN', ['வாழ்த்துக்கள்! உங்கள் எண் KBC லக்கி டிராவில் 25 லட்சம் ரூபாய் வென்றுள்ளது.'], 'warn'),
 benign('lottery', 'en-IN', ["Entries for the brand's Diwali sweepstakes close on 15 Nov; winners are announced on our official website. Entry is free."]),
 benign('lottery', 'en-IN', ['KBC does not charge any fee to register; participate only through the official show website.']),
 // 3 Courier / customs
 scam('courier', 'en-IN', ["We have a parcel in your name with narcotics and passports; it's being sent to Taiwan.", 'Stay on this call, do not talk to your family, we are connecting you to police.', 'Send the amount to this RBI verification account; it will be refunded in 30 days.']),
 scam('courier', 'en-IN', ['This is customs; a case under the Narcotics Act has been filed against you.', 'Turn on your camera, we need to see your face for verification.']),
 scam('courier', 'hi-IN', ['Aapke naam ka parcel pakda gaya hai, usme narcotics aur passport hain.'], 'warn'),
 scam('courier', 'hi-IN', ['कॉल काटिए मत, परिवार से बात न करें, हम आपको पुलिस से जोड़ रहे हैं।'], 'warn'),
 scam('courier', 'ta-IN', ['இணைப்பை துண்டிக்காதீர்கள், குடும்பத்தினரிடம் பேசாதீர்கள், உங்களை போலீசுக்கு இணைக்கிறோம்.'], 'warn'),
 benign('courier', 'en-IN', ['Your parcel is out for delivery; keep the delivery OTP ready for the agent at your doorstep.']),
 benign('courier', 'en-IN', ['FedEx never asks for payment to release a shipment. If in doubt, track the parcel on the official website.']),
 benign('courier', 'en-IN', ['Customs duty on your imported item is shown on the invoice; pay only on the official customs portal.']),
 // 4 TRAI / SIM
 scam('trai', 'en-IN', ['This is TRAI; your mobile number has been used for illegal activity and will be disconnected tonight.', 'Share the OTP we sent so we can stop the disconnection.']),
 scam('trai', 'en-IN', ['This is TRAI; your number will be disconnected in two hours.', 'Press 9 to speak to the officer.']),
 scam('trai', 'hi-IN', ['Main TRAI se bol raha hoon, aapke mobile number se illegal activity hui hai, aaj raat tak number band ho jayega.']),
 scam('trai', 'hi-IN', ['मैं TRAI से बोल रहा हूँ, आपके मोबाइल नंबर से अवैध गतिविधि हुई है, आज रात तक नंबर बंद हो जाएगा।']),
 scam('trai', 'ta-IN', ['நான் TRAI-யில் இருந்து பேசுகிறேன், உங்கள் மொபைல் எண்ணில் சட்டவிரோத செயல் நடந்துள்ளது, இன்று இரவு எண் துண்டிக்கப்படும்.']),
 benign('trai', 'en-IN', ['TRAI does not call customers about disconnection. Report suspected fraud calls on Sanchar Saathi Chakshu.']),
 benign('trai', 'en-IN', ["Your SIM KYC is pending; visit your operator's store with original ID."]),
 // 5 Electricity
 scam('electricity', 'en-IN', ['This is the electricity board; your bill is not updated and your power will be cut tonight.', 'Download this app and make the payment to avoid the disconnection.']),
 scam('electricity', 'en-IN', ['Your meter will be disconnected at 9 pm.', 'Pay now through this link, the officer is waiting at your meter.']),
 scam('electricity', 'hi-IN', ['Ye bijli vibhag hai; aapka bill update nahi hai, aaj raat bijli kat jayegi.'], 'warn'),
 scam('electricity', 'hi-IN', ['कनेक्शन कटने से बचाने के लिए यह ऐप डाउनलोड करके अभी भुगतान कीजिए।']),
 scam('electricity', 'ta-IN', ['இணைப்பு துண்டிக்கப்படுவதை தடுக்க இந்த ஆப்பை பதிவிறக்கி இப்போதே பணம் செலுத்துங்கள்.']),
 benign('electricity', 'en-IN', ['Planned maintenance: power will be off in your area from 10 pm to 2 am tonight, as per the DISCOM notice.']),
 benign('electricity', 'en-IN', ['Your bill is due on 20 November; you can check it on the official electricity board portal.']),
 // 6 UPI refund / collect / QR
 scam('upi', 'en-IN', ['Your refund is pending; open your UPI app and scan this QR to receive it.']),
 scam('upi', 'en-IN', ['Enter your UPI PIN to get the refund credited.']),
 scam('upi', 'en-IN', ['We sent you a collect request; approve it to receive the money.']),
 scam('upi', 'hi-IN', ['Refund credit hone ke liye UPI PIN daaliye.']),
 scam('upi', 'hi-IN', ['आपका रिफंड लंबित है; UPI ऐप खोलकर यह QR स्कैन करें और पैसा पाएँ।']),
 scam('upi', 'ta-IN', ['உங்கள் பணத்திருப்பம் நிலுவையில் உள்ளது; UPI ஆப்பில் இந்த QR-ஐ ஸ்கேன் செய்து பெறுங்கள்.']),
 benign('upi', 'en-IN', ['Enter your UPI PIN to complete the payment. You never need your PIN to receive money.']),
 benign('upi', 'en-IN', ["Scan the merchant's QR code to pay for your order."]),
 // 7 Loan app
 scam('loan', 'en-IN', ['Your instant loan of 2 lakh rupees is approved; pay a processing fee of 3,000 rupees to release it.']),
 scam('loan', 'en-IN', ["You took a loan from our app; if you don't pay today we will send your photo to all your contacts."]),
 scam('loan', 'hi-IN', ['Aapka 2 lakh ka instant loan approve hai, release ke liye 3,000 processing fee bhejiye.']),
 scam('loan', 'hi-IN', ['आपने हमारी ऐप से लोन लिया है; आज पैसे नहीं दिए तो आपकी फोटो सबके कॉन्टैक्ट में भेज देंगे।']),
 scam('loan', 'ta-IN', ['நீங்கள் எங்கள் ஆப்பில் கடன் வாங்கியுள்ளீர்கள்; இன்று பணம் செலுத்தாவிட்டால் உங்கள் புகைப்படத்தை எல்லா தொடர்புகளுக்கும் அனுப்புவோம்.']),
 benign('loan', 'en-IN', ["Processing fee is shown in your sanction letter and deducted from the loan amount, as per the lender's schedule of charges."]),
 benign('loan', 'en-IN', ["Your EMI of Rs 2,400 is due on 5 November; pay through the lender's official app."]),
 // 8 Investment / task
 scam('investment', 'en-IN', ['Join our VIP group for guaranteed 40 percent monthly returns on stock tips.', 'Deposit the amount in this app; our analyst will place trades for you.']),
 scam('investment', 'en-IN', ['Complete 30 tasks today and earn commission; you must deposit first to unlock tasks.']),
 scam('investment', 'en-IN', ['To withdraw your profit, pay a 10 percent tax on the amount.']),
 scam('investment', 'hi-IN', ['Hamare VIP group mein guaranteed 40 percent monthly return wale share tips lo.'], 'warn'),
 scam('investment', 'ta-IN', ['எங்கள் VIP குழுவில் சேருங்கள்: பங்கு ஆலோசனையுடன் உத்தரவாத 40 சதவீத மாத லாபம்.'], 'warn'),
 benign('investment', 'en-IN', ['Investments in securities are subject to market risks; past returns do not guarantee future returns.']),
 benign('investment', 'en-IN', ["Check your investment adviser's SEBI registration number on the SEBI website before following any tip."]),
 // 9 Family emergency
 scam('family', 'en-IN', ["Mom, I've had an accident and I'm in trouble; send money now."]),
 scam('family', 'en-IN', ["I'm calling from a new number, my phone broke.", "Don't tell Papa, he'll be angry; just transfer the amount."]),
 scam('family', 'en-IN', ['The hospital needs the deposit in 10 minutes; send it to this account.']),
 scam('family', 'hi-IN', ['Maa, main accident mein phas gaya hoon, abhi paise bhejo.']),
 scam('family', 'hi-IN', ['माँ, मेरा एक्सीडेंट हो गया है, मैं मुसीबत में हूँ, अभी पैसे भेजो।']),
 scam('family', 'ta-IN', ['அம்மா, எனக்கு விபத்து நடந்துவிட்டது, நான் சிக்கலில் இருக்கிறேன், உடனே பணம் அனுப்புங்கள்.']),
 benign('family', 'en-IN', ["Mom, I'm at the airport; I'll call you when I land."]),
 benign('family', 'en-IN', ["Your hospital bill is due; you can pay at the billing counter or through the hospital's official portal."]),
 // 10 Tech support / remote access
 scam('remote', 'en-IN', ['Your phone has a virus; install AnyDesk so our engineer can fix it.']),
 scam('remote', 'en-IN', ['Your bank account will be locked; download this APK to verify your identity.']),
 scam('remote', 'en-IN', ['Share your screen and enter the code shown on it so we can check.']),
 scam('remote', 'hi-IN', ['Aapke phone mein virus hai, hamara AnyDesk app install kijiye taaki engineer theek kar sake.']),
 scam('remote', 'hi-IN', ['आपके फ़ोन में वायरस है; हमारी टीम ठीक कर सके इसलिए AnyDesk ऐप इंस्टॉल करें।']),
 scam('remote', 'ta-IN', ['உங்கள் போனில் வைரஸ் உள்ளது; எங்கள் பொறியாளர் சரிசெய்ய AnyDesk ஆப்பை நிறுவுங்கள்.']),
 benign('remote', 'en-IN', ["Your bank's official app is available on the Play Store and App Store; install only from there."]),
 benign('remote', 'en-IN', ['Windows update is available; restart your computer to finish installing it.']),
 // 11 Digital arrest
 scam('digital_arrest', 'en-IN', ['This is the CBI; your Aadhaar was used in a money-laundering case.', 'Stay on video call; do not disconnect and do not talk to anyone.']),
 scam('digital_arrest', 'en-IN', ['The court has issued a warrant; you must pay a bail amount now.']),
 scam('digital_arrest', 'en-IN', ['Transfer the amount to this RBI safe account; it will be returned after verification.']),
 scam('digital_arrest', 'hi-IN', ['Video call pe rahiye, disconnect mat kijiye, aur kisi se baat mat kijiye.'], 'warn'),
 scam('digital_arrest', 'hi-IN', ['वीडियो कॉल पर बने रहिए, कॉल मत काटिए और किसी से बात न करें।'], 'warn'),
 scam('digital_arrest', 'ta-IN', ['வீடியோ அழைப்பிலேயே இருங்கள், துண்டிக்காதீர்கள், யாரிடமும் பேசாதீர்கள்.'], 'warn'),
 benign('digital_arrest', 'en-IN', ["A court hearing may be held over video conference; the court's official notice will give the link."]),
 benign('digital_arrest', 'en-IN', ['CBI and police do not arrest people through video calls. Report suspicious calls at 1930 or cybercrime.gov.in.']),
].map((x, i) => ({ id: `fam-${x.family}-${x.language}-${i + 1}`, ...x }));
