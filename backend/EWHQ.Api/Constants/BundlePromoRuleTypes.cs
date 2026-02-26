using System.Collections.Generic;

namespace EWHQ.Api.Constants;

public static class BundlePromoRuleTypes
{
    public const int DetailByCategory = 1;
    public const int DetailByItem = 2;
    public const int DetailByPrice = 3;

    public static readonly HashSet<int> DetailTypes = new()
    {
        DetailByCategory,
        DetailByItem,
        DetailByPrice
    };

    public const int DeductAmount = 1;
    public const int SellAs = 2;
    public const int DeductPercent = 3;

    public static readonly HashSet<int> DeductTypes = new()
    {
        DeductAmount,
        SellAs,
        DeductPercent
    };
}
