package tm.auto.phoneagent

import android.telephony.SmsManager

class SmsSender {
  fun send(phone: String, body: String) {
    SmsManager.getDefault().sendTextMessage(phone, null, body, null, null)
  }
}
