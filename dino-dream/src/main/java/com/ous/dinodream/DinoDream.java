package com.ous.dinodream;

import android.annotation.SuppressLint;
import android.graphics.Color;
import android.service.dreams.DreamService;
import android.view.KeyEvent;
import android.webkit.WebSettings;
import android.webkit.WebView;

/**
 * Screensaver that runs Chromium's offline T-Rex game. A bot plays it on its own;
 * OK / Up jumps and Down ducks to take over, and any other key ends the screensaver.
 */
public class DinoDream extends DreamService {
    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    public void onAttachedToWindow() {
        super.onAttachedToWindow();
        setInteractive(true);   // remote keys reach the game instead of ending the dream
        setFullscreen(true);
        setScreenBright(false); // dim the screen where the TV supports it

        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        web.setFocusable(false);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        // Remote keys reach the page through evaluateJavascript, which is not a user gesture,
        // so the game's AudioContext would otherwise stay suspended when the viewer plays.
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);   // file:///android_asset stays readable
        s.setAllowContentAccess(false);
        s.setGeolocationEnabled(false);
        setContentView(web);
        web.loadUrl("file:///android_asset/dino/index.html");
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int code = e.getKeyCode();
        String key = gameKey(code);
        if (key != null) {
            int action = e.getAction();
            if (web != null && e.getRepeatCount() == 0
                    && (action == KeyEvent.ACTION_DOWN || action == KeyEvent.ACTION_UP)) {
                boolean down = action == KeyEvent.ACTION_DOWN;
                web.evaluateJavascript("window.dinoKey&&dinoKey('" + key + "'," + down + ")", null);
            }
            return true;
        }
        if (code == KeyEvent.KEYCODE_VOLUME_UP || code == KeyEvent.KEYCODE_VOLUME_DOWN
                || code == KeyEvent.KEYCODE_VOLUME_MUTE) {
            return super.dispatchKeyEvent(e);
        }
        // Back, Menu and the rest leave the screensaver. Finish on key down so
        // the matching key up lands on nothing that acts on it.
        if (e.getAction() == KeyEvent.ACTION_DOWN) {
            finish();
        }
        return true;
    }

    private static String gameKey(int code) {
        switch (code) {
            case KeyEvent.KEYCODE_DPAD_UP:
            case KeyEvent.KEYCODE_DPAD_CENTER:
            case KeyEvent.KEYCODE_ENTER:
            case KeyEvent.KEYCODE_NUMPAD_ENTER:
            case KeyEvent.KEYCODE_BUTTON_A:
            case KeyEvent.KEYCODE_SPACE:
                return "jump";
            case KeyEvent.KEYCODE_DPAD_DOWN:
                return "duck";
            case KeyEvent.KEYCODE_DPAD_LEFT:
            case KeyEvent.KEYCODE_DPAD_RIGHT:
                return "auto";   // hand the game back to the bot
            default:
                return null;
        }
    }

    @Override
    public void onDetachedFromWindow() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDetachedFromWindow();
    }
}
