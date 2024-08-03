import EventEmitter2 from 'eventemitter2';
import { Children } from './children';

export class Folder<Root extends boolean = boolean> {
  public readonly type = 'folder';
  public readonly changes = new EventEmitter2({ wildcard: true });

  public constructor(name?: Folder<Root>['name']) {
    if (name) this._name = name;
  }

  // === parent === //

  private _parent: Root extends true ? null : Folder | null = null;
  public get parent() {
    return this._parent;
  }
  public set parent(parent) {
    if (this._parent) {
      this._parent.children.remove(this);
      this._parent.changes.emit('childrenUpdate');
      this._parent.changes.emit('childCreate', this);
    }
    if (parent) {
      parent.children.push(this);
      parent.changes.emit('childrenUpdate');
      parent.changes.emit('childCreate', this);
    }
    this._parent = parent;
    for (const a of this.ancestors) a.expanded = true;
    this.changes.emit('parentUpdate');
  }
  public get root(): Folder<true> | null {
    if (!this.parent) return this as never;
    let parent = this.parent;
    while (parent?.parent) parent = parent.parent as never;
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

  // === children === //

  public readonly children = new Children();
  public get descendants() {
    const descendants = new Children(...this.children);
    for (const child of this.children)
      if (child instanceof Folder) descendants.push(...child.descendants);
    return descendants;
  }
  public get lineage() {
    return new Children(this, ...this.descendants);
  }

  // === name === //

  private _name: Root extends true ? '::root::' : string = '' as never;
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
      const existing = this.parent.children.find((c) => c.name === name);
      if (existing) throw new Error('Name already exists');
    }
    this._name = name as never;
    this.parent?.changes.emit('childrenUpdate');
    this.changes.emit('nameUpdate');
  }

  // === path === //

  public get path(): string {
    if (this.name === '::root::') return '';
    return `${this.parent?.path || ''}${this.name}/`;
  }

  // === selected === //

  private _selected = false;
  public get selected() {
    return this._selected;
  }
  public set selected(selected) {
    if (this._selected === selected) return;
    if (selected) for (const d of this.root?.lineage || []) d.selected = false;
    this._selected = selected;
    this.changes.emit('selectedUpdate');
  }
  public select() {
    this.selected = true;
  }

  // === expanded === //

  private _expanded = false;
  public get expanded() {
    return this._expanded;
  }
  public set expanded(expanded) {
    if (this._expanded === expanded) return;
    if (expanded) for (const a of this.ancestors) a.expanded = true;
    this._expanded = expanded;
    this.changes.emit('expandedUpdate');
  }
  public expand() {
    this.expanded = true;
  }
  public collapse() {
    this.expanded = false;
  }
}
