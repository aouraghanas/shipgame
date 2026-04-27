import { Prisma } from "@prisma/client";

export function dec(v: string | number): Prisma.Decimal {
  return new Prisma.Decimal(v);
}

/** LYD margin per shipment unit (what you charge seller − Dexpress). */
export function shippingMarginLydPerUnit(
  sellToSellerLyd: Prisma.Decimal,
  dexpressCostLyd: Prisma.Decimal
): Prisma.Decimal {
  return sellToSellerLyd.minus(dexpressCostLyd);
}

export function shippingMarginLydTotal(
  sellToSellerLyd: Prisma.Decimal,
  dexpressCostLyd: Prisma.Decimal,
  units: number
): Prisma.Decimal {
  return shippingMarginLydPerUnit(sellToSellerLyd, dexpressCostLyd).mul(units);
}

/** 2% COD fee style: amount × percent / 100. */
export function percentOfAmount(amount: Prisma.Decimal, percent: Prisma.Decimal): Prisma.Decimal {
  return amount.mul(percent).div(100);
}

export function leadFeeTotalUsd(leadCount: number, leadFeeUsd: Prisma.Decimal): Prisma.Decimal {
  return leadFeeUsd.mul(leadCount);
}
