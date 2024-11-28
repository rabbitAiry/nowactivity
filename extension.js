import St from 'gi://St';
import Gio from "gi://Gio";
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Calendar from "resource:///org/gnome/shell/ui/calendar.js";


export default class NowActivityExtension extends Extension {
    enable() {
        this.isEnable = true;
        this.initIndicator();
        this.patchEvents();
        this.taskId = GLib.timeout_add_seconds(
            GLib.PRIORITY_LOW,               // priority of the source
            60,                              // seconds to wait
            () => {                          // the callback to invoke
                this.getNowActivity();
                return this.isEnable ? GLib.SOURCE_CONTINUE : GLib.SOURCE_REMOVE; // the return value; to recurse or not?
            }
        );
    }

    disable() {
        this.isEnable = false;
        this.indicator?.destroy();
        this.indicator = null;
    }

    initIndicator() {
        this.iconIdle = Gio.icon_new_for_string(this.path + "/res/tea.svg");
        this.iconDelay = Gio.icon_new_for_string(this.path + "/res/delay.svg");

        this.indicator = new PanelMenu.Button(0.5, this.metadata.name, false);
        this.icon = new St.Icon({ y_align: Clutter.ActorAlign.CENTER, style_class: 'system-status-icon'});
        this.label = new St.Label({ y_align: Clutter.ActorAlign.CENTER, style_class: 'system-status-label' });
        let layout = new St.BoxLayout({ style_class: 'panel-status-menu-box' });
        layout.add_child(this.icon);
        layout.add_child(this.label);
        this.indicator.add_child(layout);
        this.indicator.connect('button-press-event', () => this.getNowActivity());
        Main.panel._addToPanelBox('NowActivity', this.indicator, -1, Main.panel._leftBox);
    }

    patchEvents() {
        this.src = new Calendar.DBusEventSource();
        this.getNowActivity()
    }

    getNowActivity() {
        if (!this.isEnable || this.src.isLoading) return;
        let now = new Date();
        let dateStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let dateEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        let events = this.src.getEvents(dateStart, dateEnd);

        if (events.length == 0) {
            this.setNoActivityNow()
        } else {
            let fullDayActivityList = [];
            let nowActivityList = [];
            let futureNextActivity = null;
            let futureDiff = Number.MAX_VALUE;
            events.forEach(e => {
                if (this.isFullDayActivity(dateStart, e)) {
                    fullDayActivityList.push(e);
                } else if (this.isNowActivity(now, e)) {
                    nowActivityList.push(e);
                } else {
                    let diff = this.timeWaitingForActivity(now, e)
                    if(diff > 0 && diff < futureDiff){
                        futureNextActivity = e
                        futureDiff = diff
                    }
                }
            });
            this.setActivityText(fullDayActivityList, nowActivityList, futureNextActivity)
        }
    }

    setActivityText(fullDayActivityList, nowActivityList, future) {
        if (fullDayActivityList.length != 0 || nowActivityList.length != 0) {
            let fullDayTextList = fullDayActivityList.map(it => it.summary)
            let nowTextList = nowActivityList.map(it => it.summary + " ➔ " + this.dateToTimeText(it.end))
            let textList = fullDayTextList.concat(nowTextList)
            this.setText(textList.join("  |  "));
            this.icon.icon_name = "today-symbolic";
        } else if (future != null) {
            this.setText(`   (${this.dateToTimeText(future.date)} ➔ ${future.summary})`);
            this.icon.set_gicon(this.iconDelay);
        } else {
            this.setNoActivityNow();   
        }
    }

    setNoActivityNow() {
        this.setText("");
        this.icon.set_gicon(this.iconIdle);
    }

    setText(text) {
        this.label.text = text;
    }

    isFullDayActivity(start, event) {
        return (
            event.date.getHours() == start.getHours() &&
            event.date.getMinutes() == 0 &&
            event.end.getHours() == start.getHours() &&
            event.end.getMinutes() == 0
        )
    }

    isNowActivity(now, event) {
        return event.date <= now && now <= event.end;
    }

    timeWaitingForActivity(now, event) {
        return event.date.getTime() - now.getTime();
    }

    dateToTimeText(date) {
        let hour = date.getHours().toString().padStart(2, '0');
        let minute = date.getMinutes().toString().padStart(2, '0');
        return `${hour}:${minute}`;
    }
}