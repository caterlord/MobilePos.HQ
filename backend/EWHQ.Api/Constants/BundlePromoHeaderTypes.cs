using System.Collections.Generic;

namespace EWHQ.Api.Constants;

public static class BundlePromoHeaderTypes
{
    public const int PromoMealSetFreeDiscountItem = 1;
    public const int PromoBuyOneGetOneFree = 2;
    public const int PromoBuyMultiGetOneFree = 3;
    public const int PromoComboDealFixDiscount = 4;
    public const int PromoComboDealPercentDiscount = 5;
    public const int DiscountFix = 6;
    public const int DiscountPercent = 7;
    public const int MealSetSelective = 8;
    public const int MealSetFix = 9;
    public const int DiscountOpen = 10;
    public const int PromoBuyMultiGetMulti = 11;
    public const int DiscountFixItem = 12;
    public const int DiscountPercentItem = 13;
    public const int UpgradeItem = 14;

    public static readonly HashSet<int> PromotionTypes = new()
    {
        PromoMealSetFreeDiscountItem,
        PromoBuyOneGetOneFree,
        PromoBuyMultiGetOneFree,
        PromoComboDealFixDiscount,
        PromoComboDealPercentDiscount,
        PromoBuyMultiGetMulti
    };

    public static readonly HashSet<int> DiscountTypes = new()
    {
        DiscountFix,
        DiscountPercent,
        DiscountOpen,
        DiscountFixItem,
        DiscountPercentItem,
        UpgradeItem
    };

    public static readonly HashSet<int> MealSetTypes = new()
    {
        MealSetSelective,
        MealSetFix
    };

    public const int DefaultPromotionType = PromoComboDealPercentDiscount;
    public const int DefaultDiscountType = DiscountPercent;
}
