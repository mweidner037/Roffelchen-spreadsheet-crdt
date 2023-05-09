import {
  AbstractDoc,
  CList,
  CObject,
  CValueMap,
  CValueSet
} from "@collabs/collabs";

/**
 * @template C extends Collab
 * @template Args extends any[]
 */
class CKeepList extends CObject {
  /**
   *
   * @param {InitToken} init
   * @param {(...args: Args) => C} valueConstructor
   */
  constructor(init, valueConstructor) {
    super(init);

    /** @type {CList<C, Args>} */
    this.list = super.registerCollab(
      "list",
      (init) => new CList(init, valueConstructor)
    );
    /** @type {CValueSet<CollabID<C>>} */
    this.set = super.registerCollab("set", (init) => new CValueSet(init));

    // View of this.set elements in order by this.list.
    /** @type {LocalList<C>} */
    this.view = this.list.newLocalList();
    this.set.on("Add", (e) => {
      /** @type {C} */
      const value = this.list.fromID(e.value);
      /** @type {Position} */
      const position = this.list.positionOf(value);
      this.view.set(position, value);
    });
    this.set.on("Delete", (e) => {
      /** @type {C} */
      const value = this.list.fromID(e.value);
      /** @type {Position} */
      const position = this.list.positionOf(value);
      this.view.delete(position);
    });
    this.list.on("Move", (e) => {
      for (let i = 0; i < e.values.length; i++) {
        const value = e.values[i];
        if (this.set.has(this.list.idOf(value))) {
          // Move the value from previousPositions[i] to positions[i].
          this.view.delete(e.previousPositions[i]);
          this.view.set(e.positions[i], value);
        }
      }
    });

    // Lazy events.
    for (const collab of [this.list, this.set]) {
      collab.on("Any", (e) => this.emit("Any", e));
    }
  }

  /**
   *
   * @param {number} i
   * @param  {...Args} args
   * @returns C
   */
  insert(i, ...args) {
    // Insert after this.view.get(i - 1).
    let listIndex;
    if (i === 0) listIndex = 0;
    else {
      const previousPos = this.view.getPosition(i - 1);
      listIndex = this.list.indexOfPosition(previousPos) + 1;
    }

    const value = this.list.insert(listIndex, ...args);
    this.set.add(this.list.idOf(value));
    return value;
  }

  /**
   *
   * @param {number} i
   */
  delete(i) {
    const value = this.view.get(i);
    this.set.delete(this.list.idOf(value));
  }

  /**
   *
   * @param {number} i
   */
  keep(i) {
    const value = this.view.get(i);
    this.set.add(this.list.idOf(value));
  }

  // Move...

  /**
   *
   * @param {number} i
   * @returns C
   */
  get(i) {
    return this.view.get(i);
  }

  [Symbol.iterator]() {
    return this.view.values();
  }
}

class CCol extends CObject {
  // Column properties...
}

class CRow extends CObject {
  // Row properties...
}

export class CSpreadsheet extends CObject {
  constructor(init) {
    super(init);

    /** @type {CKeepList<CRow, []>} */
    this.rows = super.registerCollab(
      "rows",
      (init) => new CKeepList(init, (valueInit) => new CRow(valueInit))
    );
    /** @type {CKeepList<CCol, []>} */
    this.cols = super.registerCollab(
      "cols",
      (init) => new CKeepList(init, (valueInit) => new CCol(valueInit))
    );
    /** @type {CValueMap<[CollabID<CRow>, CollabID<CCol>], string>} */
    this._cells = super.registerCollab("cells", (init) => new CValueMap(init));

    // Lazy events.
    for (const collab of [this.rows, this.cols, this._cells]) {
      collab.on("Any", (e) => this.emit("Any", e));
    }
  }

  /**
   *
   * @param {number} row
   * @param {number} col
   * @param {string} value
   */
  edit_cell(row, col, value) {
    this.rows.keep(row);
    this.cols.keep(col);
    const rowID = this.rows.idOf(this.rows.get(row));
    const colID = this.cols.idOf(this.cols.get(col));
    // TODO: delete instead, if value === ""?
    this._cells.set([rowID, colID], value);
  }

  /**
   *
   * @param {number} i
   */
  remove_row(i) {
    this.cols.delete(i);
  }

  /**
   *
   * @param {number} i
   */
  remove_column(i) {
    this.cols.delete(i);
  }

  insert_row(i) {
    this.rows.insert(i);
  }

  insert_column(i) {
    this.cols.insert(i);
  }

  cells() {
    const rowsArr = [...this.rows];
    const colsArr = [...this.cols];
    /** @type {string[][]} */
    const ans = [];
    for (let r = 0; r < rowsArr.length; r++) {
      const row = rowsArr[r];
      ans.push([]);
      for (let c = 0; c < colsArr.length; c++) {
        const col = colsArr[c];
        ans[r][c] =
          this._cells.get([this.rows.idOf(row), this.cols.idOf(col)]) ?? "";
      }
    }
    return ans;
  }

  rowLength() {
    return this.rows.length;
  }

  colLength() {
    return this.cols.length;
  }
}

export class SpreadsheetDoc extends AbstractDoc {
  /**
   * 
   * @param {import("@collabs/collabs").RuntimeOptions} options 
   */
  constructor(options) {
    super(options);

    /** @type {CSpreadsheet} */
    this.spreadsheet = this.runtime.registerCollab(
      "",
      (init) => new CSpreadsheet(init)
    );
  }
}
