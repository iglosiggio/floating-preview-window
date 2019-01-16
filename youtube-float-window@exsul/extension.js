// Copyright (c) Ulisses 2019
// License: MIT

const Meta = imports.gi.Meta;
const Lang = imports.lang;
const Main = imports.ui.main;


function init(em)
{
  return new HoppingWindow(em)
}

function HoppingWindow(em)
{
  this.corner = 2;
}

HoppingWindow.prototype =
{
  enable: function()
  {
    this.workspaceSwitchSignal
      = global.workspace_manager.connect( "workspace-switched" , Lang.bind(this, this.try_spawn)
                               )
  }
  ,
  disable: function()
  {
    this.despawn_window()
    global.workspace_manager.disconnect(this.workspaceSwitchSignal)
  }
  ,
  try_spawn: function()
  {
    this.despawn_window()

    let target = this.find_window("YouTube")
    if (target)
      this.spawn_window(target)
  }
  ,
  find_window: function(title)
  {
    let workspaces_count = global.workspace_manager.n_workspaces;

    let active_workspace_index
      = global.workspace_manager.get_active_workspace_index();

    for (let i = 0; i < workspaces_count; i++)
      if (i != active_workspace_index)
      {
        let workspace
          = global.workspace_manager.get_workspace_by_index(i);

        return this.find_window_in_workspace(workspace, title);
      }
  }
  ,
  find_window_in_workspace: function(workspace, title)
  {
    let windows
      = workspace.list_windows();

    for (let i in windows)
      if (windows[i].get_title().search(title) > -1)
        return windows[i];
  }
  ,
  despawn_window: function()
  {
    if (!this.preview)
      return;

    this.preview.destroy()
    this.preview = null
  }
  ,
  spawn_window: function(win)
  {
    this.despawn_window()

    this.preview = new imports.gi.St.Button({ style_class: "youtube-preview" })
    let th = this.generate_texture(win, 150)
    this.preview.add_actor(th)


    function increment(i)
    {
      return i + 1;
    }

    let event = Lang.bind(this, _ => this.switchCorner(increment));
    this.preview.connect("enter-event", event);
    this.switchCorner()

    Main.layoutManager.addChrome(this.preview)
  }
  ,
  generate_texture: function(win, size)
  {
    let mutw = win.get_compositor_private()

    if (!mutw)
      return;

    let wtext = mutw.get_texture()
    let [width, height] = wtext.get_size()
    let scale = Math.min(1.0, size / width, size / height)
    let th = new imports.gi.Clutter.Clone
    ({
       source: wtext
       , reactive: true
       , width: width * scale
       , height: height * scale
    });

    return th
  }
}

HoppingWindow.prototype.switchCorner = function(increment)
{
  if (typeof increment == 'function')
    this.corner = increment(this.corner) % 4



  let g = Main.layoutManager.getWorkAreaForMonitor(0)

  let border_size = 0;

  let drawable_rect =
  [
    g.x,
    g.y,
    g.x + g.width - this.preview.get_width(),
    g.y + g.height - this.preview.get_height(),
  ];

  let points =
  [
    [
      drawable_rect[0],
      drawable_rect[1],
    ]
    ,
    [
      drawable_rect[0],
      drawable_rect[3],
    ]
    ,
    [
      drawable_rect[2] - 30,
      2,
    ]
    ,
    [
      drawable_rect[2],
      drawable_rect[3],
    ]
    ,
  ];

  global.log("corner: " + this.corner)

  this.posX = points[this.corner][0];
  this.posY = points[this.corner][1];

  this.preview.set_position(this.posX, this.posY);
};
