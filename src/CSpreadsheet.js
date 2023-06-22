import {
  AbstractDoc,
  CList,
  CObject,
  CValueMap
} from "@collabs/collabs";

class CCol extends CObject {
  // Column properties...
}

class CRow extends CObject {
  // Row properties...
}

export class CSpreadsheet extends CObject {
  constructor(init) {
    super(init);

    /** @type {CList<CRow, []>} */
    this.rows = super.registerCollab(
      "rows",
      (init) => new CList(init, (valueInit) => new CRow(valueInit))
    );
    /** @type {CList<CCol, []>} */
    this.cols = super.registerCollab(
      "cols",
      (init) => new CList(init, (valueInit) => new CCol(valueInit))
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
    // Use restore to keep the row & col alive.
    this.rows.restore(this.rows.get(row));
    this.cols.restore(this.cols.get(col));
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
    // Use archive so that restore can revive it.
    this.rows.archive(i);
  }

  /**
   *
   * @param {number} i
   */
  remove_column(i) {
    this.cols.archive(i);
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
