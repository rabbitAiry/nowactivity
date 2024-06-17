import St from 'gi://St';
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
        this._indicator?.destroy();
        this._indicator = null;
    }

    initIndicator() {
        this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);
        this._icon = new St.Icon({ y_align: Clutter.ActorAlign.CENTER, style_class: 'system-status-icon', icon_name: "today-symbolic" });
        this._label = new St.Label({ y_align: Clutter.ActorAlign.CENTER, style_class: 'system-status-label' });
        let layout = new St.BoxLayout({ y_align: Clutter.ActorAlign.CENTER, style_class: 'panel-status-menu-box' });
        layout.add_child(this._icon);
        layout.add_child(this._label);
        this._indicator.add_child(layout);
        this._indicator.connect('button-press-event', () => this.getNowActivity());
        Main.panel._addToPanelBox('NowActivity', this._indicator, -1, Main.panel._leftBox);
    }

    patchEvents() {
        this.src = new Calendar.DBusEventSource();
        this.getNowActivity()

        // let original = this.src._reloadEvents;
        // let obj = this
        // this.src._reloadEvents = function () {
        //     original()
        //     obj.getNowActivity()
        // }
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
            let fullDayActivityList = []
            let nowActivityList = []
            events.forEach(e => {
                if (this.isFullDayActivity(dateStart, e)) {
                    fullDayActivityList.push(e);
                } else if (this.isNowActivity(now, e)) {
                    nowActivityList.push(e);
                }
            });
            this.setActivityText(fullDayActivityList, nowActivityList)
        }
    }

    setActivityText(fullDayActivityList, nowActivityList) {
        if (fullDayActivityList.length == 0 && nowActivityList.length == 0) {
            this.setNoActivityNow()
        } else {
            let fullDayTextList = fullDayActivityList.map(it => it.summary)
            let nowTextList = nowActivityList.map(it => it.summary + " 🡪 " + this.dateToTimeText(it.end))
            let textList = fullDayTextList.concat(nowTextList)
            this.setText(textList.join("  |  "))

            console.log("fullDayTextList")
            console.log(fullDayTextList)
            console.log("textList")
            console.log(textList)
        }
    }

    setNoActivityNow() {
        this.setText("")
    }

    setText(text) {
        this._label.text = text;
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
        return event.date <= now && now <= event.end
    }

    dateToTimeText(date) {
        let hour = date.getHours().toString().padStart(2, '0');
        let minute = date.getMinutes().toString().padStart(2, '0');
        return `${hour}:${minute}`;
    }
}
/*
Array [
    {
        "id": "fdbcdda3fb9bb137df10e99b311f14011af8a039\n6coe68o3orh54spj70n405rl39@google.com\n",
        "date": "2024-06-16T01:00:00.000Z",
        "end": "2024-06-16T02:00:00.000Z",
        "summary": "NowActivity项目"
    },
    {
        "id": "fdbcdda3fb9bb137df10e99b311f14011af8a039\n6dscaj87ofte43tai2ro7ohrvn@google.com\n",
        "date": "2024-06-16T03:00:00.000Z",
        "end": "2024-06-16T04:00:00.000Z",
        "summary": "雨前运动"
    },
    {
        "id": "fdbcdda3fb9bb137df10e99b311f14011af8a039\n2sno5n8tk174n84es2nabp4qgg@google.com\n",
        "date": "2024-06-16T06:00:00.000Z",
        "end": "2024-06-16T07:00:00.000Z",
        "summary": "高数计划"
    },
    {
        "id": "fdbcdda3fb9bb137df10e99b311f14011af8a039\n79u3al67frlbe8oru78i5b2ik2@google.com\n",
        "date": "2024-06-16T07:00:00.000Z",
        "end": "2024-06-16T08:00:00.000Z",
        "summary": "b26 处理器-异常、指令级并行"
    },
    {
        "id": "fdbcdda3fb9bb137df10e99b311f14011af8a039\n6bie3rjn4eo9hhnqq4m6aj3jhe@google.com\n",
        "date": "2024-06-16T08:00:00.000Z",
        "end": "2024-06-16T09:00:00.000Z",
        "summary": "b30 处理器-剩"
    },
    {
        "id": "fdbcdda3fb9bb137df10e99b311f14011af8a039\n1ohmal7d0je5ivd7mdi0cjshh9@google.com\n",
        "date": "2024-06-16T09:00:00.000Z",
        "end": "2024-06-16T10:00:00.000Z",
        "summary": "存储-预览"
    },
    {
        "id": "fdbcdda3fb9bb137df10e99b311f14011af8a039\n6cjdmvb8d0ljl09s11audlnqbk@google.com\n",
        "date": "2024-06-16T12:00:00.000Z",
        "end": "2024-06-16T13:00:00.000Z",
        "summary": "ml9 序列化APIs"
    },
    {
        "id": "fdbcdda3fb9bb137df10e99b311f14011af8a039\n26pv5c8g2k9781ff83uajt3hej@google.com\n",
        "date": "2024-06-16T13:00:00.000Z",
        "end": "2024-06-16T14:00:00.000Z",
        "summary": "ml10 NLP训练新闻分词"
    }
]
*/