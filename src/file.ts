import EventEmitter2 from 'eventemitter2';
import { Children } from './children';
import type { Folder } from './folder';

export class File {
  public readonly type = 'file';
  public readonly changes = new EventEmitter2({ wildcard: true });

  public constructor(name?: File['name']) {
    if (name) this._name = name;
  }

  // === parent === //

  private _parent: Folder | null = null;
  public get parent() {
    return this._parent;
  }
  public set parent(parent) {
    if (this._parent) {
      this._parent.children.remove(this);
      this._parent.changes.emit('childDelete', this);
      this._parent.changes.emit('childrenUpdate');
    }
    if (parent) {
      parent.children.push(this);
      parent.changes.emit('childCreate', this);
      parent.changes.emit('childrenUpdate');
    }
    this._parent = parent;
    for (const a of this.ancestors) a.expanded = true;
    this.changes.emit('parentUpdate');
  }
  public get root(): Folder<true> | null {
    let parent = this.parent;
    while (parent?.parent) parent = parent.parent;
    return parent as never;
  }
  public get ancestors() {
    const ancestors = new Children<Folder>();
    let parent = this.parent;
    while (parent) {
      ancestors.push(parent);
      parent = parent.parent as never;
    }
    return ancestors;
  }

  // === name === //

  private _name = '';
  public get name() {
    return this._name;
  }
  public set name(name) {
    if (this.parent) {
      if (name === '')
        this.parent.children.where(
          (f) => f.name === '',
          (f) => (f.parent = null),
        );
      const existing = this.parent.children.some((c) => c.name === name);
      if (existing) throw new Error('A child with that name already exists');
    }
    this._name = name;
    this.parent?.changes.emit('childrenUpdate');
    this.changes.emit('nameUpdate');
  }

  // === path === //

  public get path(): string {
    return `${this.parent?.path || ''}${this.name}`;
  }

  // === content === //

  private _content = '';
  public get content() {
    return this._content;
  }
  public set content(content) {
    if (this._content === content) return;
    this._content = content;
    this.changes.emit('contentUpdate');
  }

  // === selected === //

  private _selected = false;
  public get selected() {
    return this._selected;
  }
  public set selected(selected) {
    if (this._selected === selected) return;
    if (selected) for (const a of this.ancestors) a.expanded = true;
    if (selected) for (const d of this.root?.lineage || []) d.selected = false;
    this._selected = selected;
    this.changes.emit('selectedUpdate');
  }
  public select() {
    this.selected = true;
    return this;
  }

  // === opened === //

  private _opened = false;
  public get opened() {
    return this._opened;
  }
  public set opened(opened) {
    if (this._opened === opened) return;
    if (opened)
      for (const d of this.root?.descendants || [])
        if (d.type === 'file') d.opened = false;
    this._opened = opened;
    this.changes.emit('openedUpdate');
    this.root?.changes.emit('openedChange');
  }
  public open() {
    this.opened = true;
    return this;
  }
  public close() {
    this.opened = false;
    return this;
  }

  // === focused === //

  private _focused = false;
  public get focused() {
    return this._focused;
  }
  public set focused(focused) {
    if (this._focused === focused) return;
    if (focused)
      for (const d of this.root?.descendants || [])
        if (d.type === 'file') d.focused = false;
    this._focused = focused;
    this.changes.emit('focusedUpdate');
    this.root?.changes.emit('focusedChange');
  }
  public focus() {
    this.focused = true;
    return this;
  }
}
