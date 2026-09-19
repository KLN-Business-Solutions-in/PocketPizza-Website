type DecimalLike = number | string;

class Decimal {
  private paise: number;

  constructor(value: DecimalLike) {
    if (typeof value === 'number') {
      this.paise = Math.round(value * 100);
    } else {
      this.paise = Math.round(parseFloat(value) * 100);
    }
  }

  plus(other: Decimal): Decimal {
    const result = new Decimal(0);
    result.paise = this.paise + other.paise;
    return result;
  }

  minus(other: Decimal): Decimal {
    const result = new Decimal(0);
    result.paise = this.paise - other.paise;
    return result;
  }

  times(other: Decimal): Decimal {
    const result = new Decimal(0);
    result.paise = Math.round((this.paise * other.paise) / 100);
    return result;
  }

  toFixed(digits: number): string {
    const rupees = this.paise / 100;
    return rupees.toFixed(digits);
  }

  toString(): string {
    return (this.paise / 100).toString();
  }

  toPaise(): number {
    return this.paise;
  }
}

export function toDecimal(value: DecimalLike): Decimal {
  return new Decimal(value);
}

export function add(a: DecimalLike, b: DecimalLike): Decimal {
  return toDecimal(a).plus(toDecimal(b));
}

export function subtract(a: DecimalLike, b: DecimalLike): Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

export function multiply(a: DecimalLike, b: DecimalLike): Decimal {
  return toDecimal(a).times(toDecimal(b));
}

export function sum(values: DecimalLike[]): Decimal {
  return values.reduce<Decimal>((acc, val) => acc.plus(toDecimal(val)), toDecimal(0));
}

export function toFixed2(value: DecimalLike): string {
  return toDecimal(value).toFixed(2);
}
