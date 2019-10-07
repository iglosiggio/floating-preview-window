// Copyright (c) Ulisses 2019
// License: MIT

const { Clutter, Meta, Shell, St } = imports.gi;
const Lang = imports.lang;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ExtensionSystem = imports.ui.extensionSystem;

const Me = imports.misc.extensionUtils.getCurrentExtension();

const Gettext = imports.gettext
Gettext.textdomain(Me.uuid);
Gettext.bindtextdomain(Me.uuid, Me.dir.get_child('locale').get_path());
const _ = Gettext.gettext;

const dummy = () => {};
let showing_preview = false;

class Button extends PanelMenu.Button {
  constructor(selected_cb = dummy) {
    super(1, 'WindowSelector', false);

    let box = new St.BoxLayout();
    let icon = new St.Icon({ style_class: 'system-status-icon' });
    let label = new St.Label({
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER
    });

    this._icon = icon;
    this._label = label;

    box.add(label);
    box.add(icon);

    this.actor.add_child(box);
  }

  destroy() {
    super.destroy();
  }
}

class HoppingWindow {
  constructor(em) {
    this.corner = 2;
  }

  enable() {
    this.button = new Button(win => this.toggle_preview(win));
    Main.panel.addToStatusArea('WindowSelector', this.button, 0, 'right');

    this.workspace_switch_signal = global.workspace_manager.connect(
      "workspace-switched" , () => this.check_target()
    );
    this.focus_window_signal = global.display.connect(
      'notify::focus-window', () => this.focus_change()
    );

    this.button.connect('event', (actor, event) => {
      if ((event.type() == Clutter.EventType.TOUCH_BEGIN ||
           event.type() == Clutter.EventType.BUTTON_PRESS))
        this.toggle_preview();
    });

    this.focus_change();
  }

  disable() {
    this.despawn_preview();
    global.workspace_manager.disconnect(this.workspace_switch_signal);
    global.display.disconnect(this.focus_window_signal);
    this.button.destroy();
  }

  get is_target_valid() {
    return this.target && this.target.get_compositor_private();
  }

  focus_change() {
    if (this.is_target_valid || global.display.focus_window == null)
      return;
  
    const app = Shell.WindowTracker.get_default().focus_app;
    const app_name = app.get_name();
    const app_icon = app.app_info.get_icon();
  
    this._app_name = app_name;
    this._app_window = global.display.focus_window;
    this.button._label.set_text(_('Show %s').format(app_name));
    this.button._icon.set_gicon(app_icon);
  }

  toggle_preview() {
    if (this.target) {
      this.target = null;
      this.despawn_preview();
      this.focus_change();
    } else {
      this.target = this._app_window;
      this.button._label.set_text(_('Stop showing %s').format(this._app_name));
      this.check_target();
    }
  }

  check_target() {
    if (!this.is_target_valid)
      return;

    const active_workspace = global.workspace_manager.get_active_workspace();
    const target_workspace = this.target.get_workspace();

    if (this.preview && target_workspace == active_workspace)
      this.despawn_preview();

    if (!this.preview && target_workspace != active_workspace)
      this.spawn_preview();
  }

  despawn_preview() {
    if (!this.preview)
      return;

    this.preview.destroy();
    this.preview = null;
  }

  spawn_preview() {
    this.despawn_preview();

    this.preview = new St.Button();
    let th = this.generate_texture(this.target, 150);
    this.preview.add_actor(th);

    function increment(i) { return i + 1; }

    let event = Lang.bind(this, _ => this.switchCorner(increment));
    this.preview.connect('enter-event', event);
    this.switchCorner();

    Main.layoutManager.addChrome(this.preview);
  }

  generate_texture(win, size) {
    let mutw = win.get_compositor_private();

    if (!mutw)
      return;

    let wtext = mutw.get_texture();
    let [width, height] = wtext.get_size();
    let scale = Math.min(1.0, size / width, size / height);
    let th = new imports.gi.Clutter.Clone({
       source: wtext,
       reactive: true,
       width: width * scale,
       height: height * scale
    });

    th.connect('destroy', () => {
      if (!this.is_target_valid) {
        this.target = null;
        this.focus_change();
      }
    });

    return th;
  }

  switchCorner(increment) {
    if (typeof increment == 'function')
      this.corner = increment(this.corner) % 4;
  
    let g = Main.layoutManager.getWorkAreaForMonitor(0);
    let border_size = 0;
    let drawable_rect = [
      g.x,
      g.y,
      g.x + g.width - this.preview.get_width(),
      g.y + g.height - this.preview.get_height()
    ];
    let points = [
      [drawable_rect[0], drawable_rect[1]],
      [drawable_rect[0], drawable_rect[3]],
      [drawable_rect[2], drawable_rect[1]],
      [drawable_rect[2], drawable_rect[3]],
    ];
  
    this.posX = points[this.corner][0];
    this.posY = points[this.corner][1];
  
    this.preview.set_position(this.posX, this.posY);
  }
}

function init(em) {
  return new HoppingWindow(em);
}

