using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using EWHQ.Api.Models.Entities;
using EWHQ.Api.Data.Attributes;
using System.Reflection;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using System;

namespace EWHQ.Api.Data;

/// <summary>
/// Database context for EWHQ Portal (POS system) data
/// This file is auto-generated. Do not modify directly.
/// Generated on: 2025-07-14 13:39:03
/// </summary>
public class EWHQDbContext : DbContext
{
    public EWHQDbContext(DbContextOptions<EWHQDbContext> options) : base(options)
    {
    }

    #region DbSets

    public DbSet<AccountMaster> AccountMasters { get; set; }
    public DbSet<Address> Addresses { get; set; }
    public DbSet<AddressBook> AddressBooks { get; set; }
    public DbSet<AddressDeliveryMapping> AddressDeliveryMappings { get; set; }
    public DbSet<AddressGroup> AddressGroups { get; set; }
    public DbSet<AddressMasterArea> AddressMasterAreas { get; set; }
    public DbSet<AddressMasterBuilding> AddressMasterBuildings { get; set; }
    public DbSet<AddressMasterDistrict> AddressMasterDistricts { get; set; }
    public DbSet<AddressMasterEstate> AddressMasterEstates { get; set; }
    public DbSet<AddressMasterShop> AddressMasterShops { get; set; }
    public DbSet<AddressMasterStreet> AddressMasterStreets { get; set; }
    public DbSet<AuditTrailLog> AuditTrailLogs { get; set; }
    public DbSet<BatchEditTaskDetail> BatchEditTaskDetails { get; set; }
    public DbSet<BatchEditTaskHeader> BatchEditTaskHeaders { get; set; }
    public DbSet<BatchEditTaskShopDetail> BatchEditTaskShopDetails { get; set; }
    // public DbSet<Brand> Brands { get; set; } // Moved to AdminPortalDbContext
    public DbSet<BundlePromoOverview> BundlePromoOverviews { get; set; }
    public DbSet<ButtonStyleMaster> ButtonStyleMasters { get; set; }
    public DbSet<CashDrawerDetail> CashDrawerDetails { get; set; }
    public DbSet<CashDrawerHeader> CashDrawerHeaders { get; set; }
    public DbSet<CleanLocalSalesDataLog> CleanLocalSalesDataLogs { get; set; }
    public DbSet<CommandLog> CommandLogs { get; set; }
    // public DbSet<Company> Companies { get; set; } // Moved to AdminPortalDbContext
    // public DbSet<Coupon> Coupons { get; set; }
    // public DbSet<CouponCampaign> CouponCampaigns { get; set; }
    // public DbSet<CouponCampaignDistShopMapping> CouponCampaignDistShopMappings { get; set; }
    // public DbSet<CouponCampaignMemberMapping> CouponCampaignMemberMappings { get; set; }
    // public DbSet<CouponCampaignMemberTypeMapping> CouponCampaignMemberTypeMappings { get; set; }
    // public DbSet<CouponCampaignMemberUsedCount> CouponCampaignMemberUsedCounts { get; set; }
    // public DbSet<CouponCampaignRedeemAccountMapping> CouponCampaignRedeemAccountMappings { get; set; }
    // public DbSet<CouponCampaignRedeemShopMapping> CouponCampaignRedeemShopMappings { get; set; }
    // public DbSet<CouponDistributionLog> CouponDistributionLogs { get; set; }
    // public DbSet<CouponMemberWallet> CouponMemberWallets { get; set; }
    // public DbSet<CouponRedeemLog> CouponRedeemLogs { get; set; }
    public DbSet<DbMasterTableTranslation> DbMasterTableTranslations { get; set; }
    public DbSet<Department> Departments { get; set; }
    public DbSet<DepartmentOnlineMetadata> DepartmentOnlineMetadatas { get; set; }
    public DbSet<DeviceTerminal> DeviceTerminals { get; set; }
    public DbSet<DeviceTerminalModel> DeviceTerminalModels { get; set; }
    public DbSet<DeviceUsageLogOnline> DeviceUsageLogOnlines { get; set; }
    public DbSet<Discount> Discounts { get; set; }
    public DbSet<DiscountShopDetail> DiscountShopDetails { get; set; }
    public DbSet<EmailReportLog> EmailReportLogs { get; set; }
    public DbSet<EmailReportTaskerHeader> EmailReportTaskerHeaders { get; set; }
    public DbSet<EmailReportTaskerParamDetail> EmailReportTaskerParamDetails { get; set; }
    //public DbSet<InlineCustomer> InlineCustomers { get; set; }
    //public DbSet<InlineReservation> InlineReservations { get; set; }
    public DbSet<ItemCategory> ItemCategories { get; set; }
    public DbSet<ItemCategoryShopDetail> ItemCategoryShopDetails { get; set; }
    public DbSet<ItemMaster> ItemMasters { get; set; }
    public DbSet<ItemMasterGroupRight> ItemMasterGroupRights { get; set; }
    public DbSet<ItemMasterMetaOnline> ItemMasterMetaOnlines { get; set; }
    public DbSet<ItemModifierGroupMapping> ItemModifierGroupMappings { get; set; }
    public DbSet<ItemOrderChannelMapping> ItemOrderChannelMappings { get; set; }
    public DbSet<ItemPrice> ItemPrices { get; set; }
    public DbSet<ItemPriceRuleGroupMapping> ItemPriceRuleGroupMappings { get; set; }
    public DbSet<ItemSet> ItemSets { get; set; }
    public DbSet<ItemShopDetail> ItemShopDetails { get; set; }
    public DbSet<ItemShopDetailOnlineMetaData> ItemShopDetailOnlineMetaData { get; set; }
    public DbSet<ItemSoldOutHistory> ItemSoldOutHistories { get; set; }
    public DbSet<ItemSOP> ItemSOPs { get; set; }
    public DbSet<KdsTxDetail> KdsTxDetails { get; set; }
    public DbSet<KdsTxHeader> KdsTxHeaders { get; set; }
    public DbSet<KdsTxLog> KdsTxLogs { get; set; }
    public DbSet<LoyaltyHeader> LoyaltyHeaders { get; set; }
    public DbSet<MediaLibrary> MediaLibraries { get; set; }
    // public DbSet<MemberDetail> MemberDetails { get; set; }
    // public DbSet<MemberHeader> MemberHeaders { get; set; }
    //public DbSet<MemberOnlineDetail> MemberOnlineDetails { get; set; }
    //public DbSet<MemberShopDetail> MemberShopDetails { get; set; }
    //public DbSet<MemberTxLog> MemberTxLogs { get; set; }
    public DbSet<MenuDetail> MenuDetails { get; set; }
    public DbSet<MenuHeader> MenuHeaders { get; set; }
    public DbSet<MenuHeaderMetaOnline> MenuHeaderMetaOnlines { get; set; }
    public DbSet<MenuShopDetail> MenuShopDetails { get; set; }
    public DbSet<ModifierGroupDetail> ModifierGroupDetails { get; set; }
    public DbSet<ModifierGroupHeader> ModifierGroupHeaders { get; set; }
    public DbSet<ModifierGroupOnlineDetail> ModifierGroupOnlineDetails { get; set; }
    public DbSet<ModifierGroupShopDetail> ModifierGroupShopDetails { get; set; }
    public DbSet<OclClientXFileUpload> OclClientXFileUploads { get; set; }
    public DbSet<OclServerFileDownload> OclServerFileDownloads { get; set; }
    public DbSet<OrderChannel> OrderChannels { get; set; }
    public DbSet<PayInOut> PayInOuts { get; set; }
    public DbSet<PaymentMethod> PaymentMethods { get; set; }
    public DbSet<PaymentMethodShopDetail> PaymentMethodShopDetails { get; set; }
    //public DbSet<PreprintedCouponAvtivityLog> PreprintedCouponAvtivityLogs { get; set; }
    //public DbSet<PreprintedCouponSellingDiscount> PreprintedCouponSellingDiscounts { get; set; }
    //public DbSet<PreprintedCouponSellingRule> PreprintedCouponSellingRules { get; set; }
    //public DbSet<PreprintedCouponType> PreprintedCouponTypes { get; set; }
    public DbSet<PriceRule> PriceRules { get; set; }
    public DbSet<PriceRuleGroup> PriceRuleGroups { get; set; }
    public DbSet<PrintDepartmentSlipLog> PrintDepartmentSlipLogs { get; set; }
    //public DbSet<PrintJobDetail> PrintJobDetails { get; set; }
    public DbSet<PromoDetail> PromoDetails { get; set; }
    public DbSet<PromoHeader> PromoHeaders { get; set; }
    public DbSet<PromoShopDetail> PromoShopDetails { get; set; }
//    public DbSet<RawMaterialCategoryOnline> RawMaterialCategoryOnlines { get; set; }
//    public DbSet<RawMaterialDepartmentOnline> RawMaterialDepartmentOnlines { get; set; }
//    public DbSet<RawMaterialItemMasterSetting> RawMaterialItemMasterSettings { get; set; }
//    public DbSet<RawMaterialMaster> RawMaterialMasters { get; set; }
//    public DbSet<RawMaterialMasterSupplierMappingOnline> RawMaterialMasterSupplierMappingOnlines { get; set; }
//    public DbSet<RawMaterialOnlineMetaData> RawMaterialOnlineMetaData { get; set; }
//    public DbSet<RawMaterialShopDetail> RawMaterialShopDetails { get; set; }
//    public DbSet<RawMaterialShopDetailOnlineMetaData> RawMaterialShopDetailOnlineMetaData { get; set; }
//    public DbSet<RawMaterialTxSalesDetail> RawMaterialTxSalesDetails { get; set; }
    public DbSet<Reason> Reasons { get; set; }
    public DbSet<ReasonGroup> ReasonGroups { get; set; }
    //public DbSet<Report> Reports { get; set; }
    //public DbSet<ReportAccountMappingOnline> ReportAccountMappingOnlines { get; set; }
    //public DbSet<ReportAccountMasterOnline> ReportAccountMasterOnlines { get; set; }
    //public DbSet<ReportParameter> ReportParameters { get; set; }
    //public DbSet<ReportParameterType> ReportParameterTypes { get; set; }
    public DbSet<ReportTurnoverDetail> ReportTurnoverDetails { get; set; }
    public DbSet<ReportTurnoverHeader> ReportTurnoverHeaders { get; set; }
    public DbSet<ReportTurnoverItemType> ReportTurnoverItemTypes { get; set; }
    public DbSet<RevenueCenterMaster> RevenueCenterMasters { get; set; }
    public DbSet<Roster> Rosters { get; set; }
    public DbSet<SelfOrderingMediaMaster> SelfOrderingMediaMasters { get; set; }
    public DbSet<SelfOrderingMediaShopDetail> SelfOrderingMediaShopDetails { get; set; }
    public DbSet<ServiceCharge> ServiceCharges { get; set; }
    public DbSet<ServiceChargeShopDetail> ServiceChargeShopDetails { get; set; }
    public DbSet<Shop> Shops { get; set; }
    public DbSet<ShopCodeSettingOnline> ShopCodeSettingOnlines { get; set; }
    public DbSet<ShopGroupSettingHeader> ShopGroupSettingHeaders { get; set; }
    public DbSet<ShopPriceRuleMapping> ShopPriceRuleMappings { get; set; }
    public DbSet<ShopPrinterMaster> ShopPrinterMasters { get; set; }
    public DbSet<ShopServiceAreaSetting> ShopServiceAreaSettings { get; set; }
    public DbSet<ShopSystemParameter> ShopSystemParameters { get; set; }
    public DbSet<ShopTimeSlotDetailOnline> ShopTimeSlotDetailOnlines { get; set; }
    public DbSet<ShopTimeSlotHeaderOnline> ShopTimeSlotHeaderOnlines { get; set; }
    public DbSet<ShopType> ShopTypes { get; set; }
    public DbSet<ShopWorkdayDetail> ShopWorkdayDetails { get; set; }
    public DbSet<ShopWorkdayHeader> ShopWorkdayHeaders { get; set; }
    public DbSet<ShopWorkdayHoliday> ShopWorkdayHolidays { get; set; }
    public DbSet<ShopWorkdayPeriod> ShopWorkdayPeriods { get; set; }
    public DbSet<ShopWorkdayPeriodDetail> ShopWorkdayPeriodDetails { get; set; }
    public DbSet<SmartCategory> SmartCategories { get; set; }
    public DbSet<SmartCategoryItemDetail> SmartCategoryItemDetails { get; set; }
    public DbSet<SmartCategoryOrderChannelMapping> SmartCategoryOrderChannelMappings { get; set; }
    public DbSet<SmartCategoryShopDetail> SmartCategoryShopDetails { get; set; }
    //public DbSet<SmsReportLog> SmsReportLogs { get; set; }
    //public DbSet<SmsReportTaskerHeader> SmsReportTaskerHeaders { get; set; }
    //public DbSet<SmsReportTaskerParamDetail> SmsReportTaskerParamDetails { get; set; }
    //public DbSet<SmsReportTaskerSmsToDetail> SmsReportTaskerSmsToDetails { get; set; }
    public DbSet<StaffAttendanceDetailOnline> StaffAttendanceDetailOnlines { get; set; }
    public DbSet<StaffAttendanceHeaderOnline> StaffAttendanceHeaderOnlines { get; set; }
    //public DbSet<StaffMessingAccount> StaffMessingAccounts { get; set; }
    //public DbSet<StaffMessingAccountType> StaffMessingAccountTypes { get; set; }
    //public DbSet<StockAdjustment> StockAdjustments { get; set; }
    //public DbSet<StockBulkUnitMapping> StockBulkUnitMappings { get; set; }
    //public DbSet<StockLevelShopDetail> StockLevelShopDetails { get; set; }
    //public DbSet<StockOrderDetail> StockOrderDetails { get; set; }
    //public DbSet<StockOrderDetailMetaOnline> StockOrderDetailMetaOnlines { get; set; }
    //public DbSet<StockOrderDetailReceiveOnline> StockOrderDetailReceiveOnlines { get; set; }
    //public DbSet<StockOrderHeader> StockOrderHeaders { get; set; }
    //public DbSet<StockOrderHeaderMetaOnline> StockOrderHeaderMetaOnlines { get; set; }
    //public DbSet<StockTakeDetail> StockTakeDetails { get; set; }
    //public DbSet<StockTakeDetailEndingOnline> StockTakeDetailEndingOnlines { get; set; }
    //public DbSet<StockTakeDetailEndingTranOutOnline> StockTakeDetailEndingTranOutOnlines { get; set; }
    //public DbSet<StockTakeHeader> StockTakeHeaders { get; set; }
    //public DbSet<StockTakeHeaderMetaOnline> StockTakeHeaderMetaOnlines { get; set; }
    //public DbSet<SupplierMaster> SupplierMasters { get; set; }
    public DbSet<SystemParameter> SystemParameters { get; set; }
    public DbSet<TableMaster> TableMasters { get; set; }
    public DbSet<TableOrderTokenMapping> TableOrderTokenMappings { get; set; }
    public DbSet<TableSection> TableSections { get; set; }
    public DbSet<TableSectionShopDetail> TableSectionShopDetails { get; set; }
    public DbSet<TableStatus> TableStatuses { get; set; }
    public DbSet<TableType> TableTypes { get; set; }
    //public DbSet<TaiwanUniformInvoiceBasic> TaiwanUniformInvoiceBasics { get; set; }
    //public DbSet<TaiwanUniformInvoiceBody> TaiwanUniformInvoiceBodies { get; set; }
    //public DbSet<TaiwanUniformInvoiceC0501> TaiwanUniformInvoiceC0501s { get; set; }
    //public DbSet<TaiwanUniformInvoiceComponent> TaiwanUniformInvoiceComponents { get; set; }
    //public DbSet<TaiwanUniformInvoiceHeader> TaiwanUniformInvoiceHeaders { get; set; }
    //public DbSet<TaiwanUniformInvoiceInvoice> TaiwanUniformInvoiceInvoices { get; set; }
    public DbSet<Taxation> Taxations { get; set; }
    public DbSet<TaxationShopDetail> TaxationShopDetails { get; set; }
    public DbSet<ThirdPartyMenuItemMappingOnline> ThirdPartyMenuItemMappingOnlines { get; set; }
    public DbSet<ThirdPartyReservation> ThirdPartyReservations { get; set; }
    public DbSet<TxPayment> TxPayments { get; set; }
    public DbSet<TxReceiptReprintLog> TxReceiptReprintLogs { get; set; }
    public DbSet<TxSalesAction> TxSalesActions { get; set; }
    public DbSet<TxSalesDeliveryDetail> TxSalesDeliveryDetails { get; set; }
    public DbSet<TxSalesDeliveryHeader> TxSalesDeliveryHeaders { get; set; }
    public DbSet<TxSalesDeliveryService> TxSalesDeliveryServices { get; set; }
    public DbSet<TxSalesDetail> TxSalesDetails { get; set; }
    public DbSet<TxSalesDetailLog> TxSalesDetailLogs { get; set; }
    public DbSet<TxSalesDetailVariance> TxSalesDetailVariances { get; set; }
    public DbSet<TxSalesHeader> TxSalesHeaders { get; set; }
    public DbSet<TxSalesHeaderAddress> TxSalesHeaderAddresses { get; set; }
    public DbSet<TxSalesHeaderLog> TxSalesHeaderLogs { get; set; }
    public DbSet<TxSalesHeaderOnlineMeta> TxSalesHeaderOnlineMetas { get; set; }
    public DbSet<TxSalesHeaderRevokeLog> TxSalesHeaderRevokeLogs { get; set; }
    //public DbSet<TxSalesOfflineCouponDistLog> TxSalesOfflineCouponDistLogs { get; set; }
    public DbSet<TxSalesParam> TxSalesParams { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<UserGroupDetail> UserGroupDetails { get; set; }
    public DbSet<UserGroupDetailOnline> UserGroupDetailOnlines { get; set; }
    public DbSet<UserGroupHeader> UserGroupHeaders { get; set; }
    public DbSet<UserGroupRight> UserGroupRights { get; set; }
    public DbSet<UserGroupRightCode> UserGroupRightCodes { get; set; }
    public DbSet<UserOnlineMeta> UserOnlineMetas { get; set; }
    public DbSet<WorkdayPeriodMaster> WorkdayPeriodMasters { get; set; }

    #endregion

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure composite keys and special entity configurations
        ConfigureEntityKeys(modelBuilder);

        if (Database.IsSqlServer())
        {
            ConfigureSqlServerTriggers(modelBuilder);
        }

        // Apply database-specific configurations
        ApplyDatabaseSpecificConfigurations(modelBuilder);
    }

    private static void ConfigureEntityKeys(ModelBuilder modelBuilder)
    {
        // Configure composite keys
        modelBuilder.Entity<Address>()
            .HasKey(e => new { e.AddressId, e.AccountId, e.ShopId });

        modelBuilder.Entity<AddressBook>()
            .HasKey(e => new { e.AddressBookId, e.AccountId });

        modelBuilder.Entity<AddressDeliveryMapping>()
            .HasKey(e => new { e.DeliveryId, e.AccountId, e.ShopId });

        modelBuilder.Entity<AddressGroup>()
            .HasKey(e => new { e.AddressGroupId, e.AccountId });

        modelBuilder.Entity<AddressMasterArea>()
            .HasKey(e => new { e.AreaId, e.AccountId });

        modelBuilder.Entity<AddressMasterBuilding>()
            .HasKey(e => new { e.BuildingId, e.AccountId });

        modelBuilder.Entity<AddressMasterDistrict>()
            .HasKey(e => new { e.DistrictId, e.AccountId });

        modelBuilder.Entity<AddressMasterEstate>()
            .HasKey(e => new { e.EstateId, e.AccountId });

        modelBuilder.Entity<AddressMasterShop>()
            .HasKey(e => new { e.ShopId, e.AccountId });

        modelBuilder.Entity<AddressMasterStreet>()
            .HasKey(e => new { e.StreetId, e.AccountId });

        modelBuilder.Entity<AuditTrailLog>()
            .HasKey(e => new { e.LogId, e.AccountId, e.ShopId });

        modelBuilder.Entity<BatchEditTaskDetail>()
            .HasKey(e => new { e.TaskDetailId, e.AccountId });

        modelBuilder.Entity<BatchEditTaskHeader>()
            .HasKey(e => new { e.TaskId, e.AccountId });

        modelBuilder.Entity<BatchEditTaskShopDetail>()
            .HasKey(e => new { e.TaskId, e.AccountId, e.ShopId });

        modelBuilder.Entity<BundlePromoOverview>()
            .HasKey(e => new { e.BundlePromoOverviewId, e.AccountId });

        modelBuilder.Entity<ButtonStyleMaster>()
            .HasKey(e => new { e.ButtonStyleId, e.AccountId });

        modelBuilder.Entity<ButtonStyleMaster>()
            .ToTable(tb => tb.HasTrigger("trigger_ButtonStyleMaster_UpdatedDate"));

        modelBuilder.Entity<CashDrawerHeader>()
            .HasKey(e => new { e.CashDrawerCode, e.AccountId, e.ShopId });

        modelBuilder.Entity<CashDrawerDetail>()
            .HasKey(e => new { e.CashDrawerDetailId, e.AccountId, e.ShopId });

        modelBuilder.Entity<CleanLocalSalesDataLog>()
            .HasKey(e => new { e.CleanLocalSalesDataLogId, e.AccountId, e.ShopId });

        // modelBuilder.Entity<CouponCampaign>()
        //     .HasKey(e => new { e.CouponCampaignId, e.AccountId });
        //
        // modelBuilder.Entity<CouponCampaignDistShopMapping>()
        //     .HasKey(e => new { e.CouponCampaignId, e.AccountId, e.ShopId });
        //
        // modelBuilder.Entity<Coupon>()
        //     .HasKey(e => new { e.CouponCode, e.AccountId });

        // // CouponCampaignMemberMapping composite key
        // modelBuilder.Entity<CouponCampaignMemberMapping>()
        //     .HasKey(e => new { e.CouponCampaignId, e.MemberId });
        //
        // // CouponCampaignMemberTypeMapping composite key
        // modelBuilder.Entity<CouponCampaignMemberTypeMapping>()
        //     .HasKey(e => new { e.CouponCampaignId, e.MemberTypeId });
        //
        // // CouponCampaignMemberUsedCount composite key
        // modelBuilder.Entity<CouponCampaignMemberUsedCount>()
        //     .HasKey(e => new { e.CouponCampaignId, e.AccountId, e.MemberDetailId });
        //
        // // CouponCampaignRedeemAccountMapping composite key
        // modelBuilder.Entity<CouponCampaignRedeemAccountMapping>()
        //     .HasKey(e => new { e.CouponCampaignId, e.RedeemAccountId });
        //
        // modelBuilder.Entity<CouponDistributionLog>()
        //     .HasKey(e => new { e.CouponDistributionLogId, e.AccountId });
        //
        // modelBuilder.Entity<CouponMemberWallet>()
        //     .HasKey(e => new { e.MemberWalletCouponId, e.AccountId });
        //
        // modelBuilder.Entity<CouponRedeemLog>()
        //     .HasKey(e => new { e.CouponRedeemLogId, e.AccountId });

        modelBuilder.Entity<DbMasterTableTranslation>()
            .HasKey(e => new { e.AccountId, e.DbTableName, e.DbFieldName, e.DbFieldId, e.LanguageCode });

        modelBuilder.Entity<Department>()
            .HasKey(e => new { e.DepartmentId, e.AccountId });

        modelBuilder.Entity<DepartmentOnlineMetadata>()
            .HasKey(e => new { e.DepartmentId, e.AccountId });

        modelBuilder.Entity<DeviceTerminal>()
            .HasKey(e => new { e.TerminalId, e.AccountId, e.ShopId });

        modelBuilder.Entity<DeviceUsageLogOnline>()
            .HasKey(e => new { e.DeviceUsageLogOnlineId, e.AccountId, e.ShopId });

        modelBuilder.Entity<Discount>()
            .HasKey(e => new { e.DiscountId, e.AccountId });

        modelBuilder.Entity<DiscountShopDetail>()
            .HasKey(e => new { e.DiscountId, e.AccountId, e.ShopId });

        modelBuilder.Entity<EmailReportTaskerHeader>()
            .HasKey(e => new { e.EmailReportTaskerHeaderId, e.AccountId });

        modelBuilder.Entity<EmailReportTaskerParamDetail>()
            .HasKey(e => new { e.ParamTypeId, e.EmailReportTaskerHeaderId, e.AccountId, e.Deleted });

        modelBuilder.Entity<ItemCategory>()
            .HasKey(e => new { e.CategoryId, e.AccountId });

        modelBuilder.Entity<ItemCategoryShopDetail>()
            .HasKey(e => new { e.CategoryId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ItemMaster>()
            .HasKey(e => new { e.ItemId, e.AccountId });

        modelBuilder.Entity<ItemMasterGroupRight>()
            .HasKey(e => new { e.ItemId, e.AccountId, e.GroupId });

        modelBuilder.Entity<ItemMasterMetaOnline>()
            .HasKey(e => new { e.ItemId, e.AccountId });

        modelBuilder.Entity<ItemModifierGroupMapping>()
            .HasKey(e => new { e.ItemId, e.AccountId, e.GroupHeaderId });

        modelBuilder.Entity<ItemOrderChannelMapping>()
            .HasKey(e => new { e.ItemId, e.AccountId, e.OrderChannelId });

        modelBuilder.Entity<ItemPrice>()
            .HasKey(e => new { e.ItemPriceId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ItemPriceRuleGroupMapping>()
            .HasKey(e => new { e.ItemId, e.AccountId, e.GroupId });

        modelBuilder.Entity<ItemSet>()
            .HasKey(e => new { e.ItemSetId, e.AccountId });

        modelBuilder.Entity<ItemShopDetail>()
            .HasKey(e => new { e.ItemId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ItemShopDetailOnlineMetaData>()
            .HasKey(e => new { e.ItemId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ItemSoldOutHistory>()
            .HasKey(e => new { e.ItemSoldOutHistoryId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ItemSOP>()
            .HasKey(e => new { e.ItemSOPId, e.AccountId });

        modelBuilder.Entity<KdsTxDetail>()
            .HasKey(e => new { e.KdsTxDetailId, e.AccountId, e.ShopId });

        modelBuilder.Entity<KdsTxHeader>()
            .HasKey(e => new { e.KdsTxHeaderId, e.AccountId, e.ShopId });

        modelBuilder.Entity<KdsTxLog>()
            .HasKey(e => new { e.KdsTxLogId, e.AccountId, e.ShopId });

        modelBuilder.Entity<LoyaltyHeader>()
            .HasKey(e => new { e.LoyaltyId, e.AccountId, e.ShopId });

        modelBuilder.Entity<MemberDetail>()
            .HasKey(e => new { e.MemberDetailId, e.AccountId, e.ShopId });

        modelBuilder.Entity<MemberHeader>()
            .HasKey(e => new { e.MemberHeaderId, e.AccountId });

        modelBuilder.Entity<MemberOnlineDetail>()
            .HasKey(e => new { e.MemberOnlineDetailId, e.AccountId });

        modelBuilder.Entity<MenuDetail>()
            .HasKey(e => new { e.AccountId, e.MenuId, e.CategoryId, e.IsSmartCategory });

        modelBuilder.Entity<MenuHeader>()
            .HasKey(e => new { e.MenuId, e.AccountId });
        modelBuilder.Entity<MenuHeader>()
            .Property(e => e.MenuId)
            .ValueGeneratedOnAdd();

        modelBuilder.Entity<MenuHeaderMetaOnline>()
            .HasKey(e => new { e.MenuId, e.AccountId });

        modelBuilder.Entity<MenuShopDetail>()
            .HasKey(e => new { e.MenuId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ModifierGroupHeader>()
            .HasKey(e => new { e.GroupHeaderId, e.AccountId });

        modelBuilder.Entity<ModifierGroupDetail>()
            .HasKey(e => new { e.ItemId, e.AccountId, e.GroupHeaderId });

        modelBuilder.Entity<ModifierGroupOnlineDetail>()
            .HasKey(e => new { e.AccountId, e.GroupHeaderId });

        modelBuilder.Entity<ModifierGroupShopDetail>()
            .HasKey(e => new { e.GroupHeaderId, e.AccountId, e.ShopId });

        modelBuilder.Entity<OclClientXFileUpload>()
            .HasKey(e => new { e.UploadId, e.AccountId, e.ShopId });

        modelBuilder.Entity<OclServerFileDownload>()
            .HasKey(e => new { e.DownloadId, e.AccountId });

        modelBuilder.Entity<PayInOut>()
            .HasKey(e => new { e.PayInOutId, e.AccountId, e.ShopId });

        modelBuilder.Entity<PaymentMethod>()
            .HasKey(e => new { e.PaymentMethodId, e.AccountId });

        modelBuilder.Entity<PaymentMethodShopDetail>()
            .HasKey(e => new { e.PaymentMethodId, e.AccountId, e.ShopId });

        //modelBuilder.Entity<PreprintedCouponAvtivityLog>()
        //    .HasKey(e => new { e.ActivityLogId, e.AccountId, e.ShopId });

        //modelBuilder.Entity<PreprintedCouponSellingDiscount>()
        //    .HasKey(e => new { e.CouponSellingDiscountId, e.AccountId });

        //modelBuilder.Entity<PreprintedCouponType>()
        //    .HasKey(e => new { e.CouponTypeId, e.AccountId });

        modelBuilder.Entity<PriceRule>()
            .HasKey(e => new { e.RuleId, e.AccountId });

        modelBuilder.Entity<PriceRuleGroup>()
            .HasKey(e => new { e.GroupId, e.AccountId });

        modelBuilder.Entity<PrintDepartmentSlipLog>()
            .HasKey(e => new { e.AccountId, e.ShopId, e.TxSalesHeaderId, e.TxSalesDetailId});

        modelBuilder.Entity<PromoDetail>()
            .HasKey(e => new { e.PromoDetailId, e.AccountId });

        modelBuilder.Entity<PromoHeader>()
            .HasKey(e => new { e.PromoHeaderId, e.AccountId });

        modelBuilder.Entity<PromoShopDetail>()
            .HasKey(e => new { e.PromoHeaderId, e.AccountId, e.ShopId });

        //modelBuilder.Entity<RawMaterialDepartmentOnline>()
        //    .HasKey(e => new { e.RawMaterialDepartmentId, e.AccountId });

        //modelBuilder.Entity<RawMaterialMaster>()
        //    .HasKey(e => new { e.RawMaterialId, e.AccountId });

        modelBuilder.Entity<Reason>()
            .HasKey(e => new { e.ReasonId, e.AccountId });

        //modelBuilder.Entity<Report>()
        //    .HasKey(e => new { e.ReportId});

        modelBuilder.Entity<ReasonGroup>()
            .HasKey(e => new { e.ReasonGroupId, e.AccountId });

        modelBuilder.Entity<ReportTurnoverDetail>()
            .HasKey(e => new { e.ReportTurnoverDetailId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ReportTurnoverHeader>()
            .HasKey(e => new { e.ReportTurnoverHeaderId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ReportTurnoverItemType>()
            .HasKey(e => new { e.ItemTypeId});

        modelBuilder.Entity<RevenueCenterMaster>()
            .HasKey(e => new { e.RevenueCenterId, e.AccountId });

        modelBuilder.Entity<Roster>()
            .HasKey(e => new { e.RosterId, e.AccountId, e.ShopId });

        modelBuilder.Entity<SelfOrderingMediaMaster>()
            .HasKey(e => new { e.MediaId, e.AccountId });

        modelBuilder.Entity<SelfOrderingMediaShopDetail>()
            .HasKey(e => new { e.MediaId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ServiceCharge>()
            .HasKey(e => new { e.ServiceChargeId, e.AccountId });

        modelBuilder.Entity<ServiceChargeShopDetail>()
            .HasKey(e => new { e.ServiceChargeId, e.AccountId, e.ShopId });

        modelBuilder.Entity<Shop>()
            .HasKey(e => new { e.ShopId, e.AccountId });

        modelBuilder.Entity<ShopCodeSettingOnline>()
            .HasKey(e => new { e.AccountId, e.ShopCode });  

        modelBuilder.Entity<ShopGroupSettingHeader>()
            .HasKey(e => new { e.ShopGroupId, e.AccountId });

        modelBuilder.Entity<ShopPriceRuleMapping>()
            .HasKey(e => new { e.RuleId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ShopPrinterMaster>()
            .HasKey(e => new { e.ShopPrinterMasterId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ShopServiceAreaSetting>()
            .HasKey(e => new { e.ZoneId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ShopSystemParameter>()
            .HasKey(e => new { e.ParamId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ShopTimeSlotDetailOnline>()
            .HasKey(e => new { e.TimeSlotDetailId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ShopTimeSlotHeaderOnline>()
            .HasKey(e => new { e.TimeSlotHeaderId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ShopType>()
            .HasKey(e => new { e.ShopTypeid, e.AccountId });

        modelBuilder.Entity<ShopWorkdayDetail>()
            .HasKey(e => new { e.WorkdayDetailId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ShopWorkdayHeader>()
            .HasKey(e => new { e.WorkdayHeaderId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ShopWorkdayHoliday>()
            .HasKey(e => new { e.HolidayId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ShopWorkdayPeriod>()
            .HasKey(e => new { e.WorkdayPeriodId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ShopWorkdayPeriodDetail>()
            .HasKey(e => new { e.WorkdayPeriodDetailId, e.AccountId, e.ShopId });

        modelBuilder.Entity<SmartCategory>()
            .HasKey(e => new { e.SmartCategoryId, e.AccountId });
        modelBuilder.Entity<SmartCategory>()
            .Property(e => e.SmartCategoryId)
            .ValueGeneratedOnAdd();

        modelBuilder.Entity<SmartCategoryItemDetail>()
            .HasKey(e => new { e.ItemId, e.AccountId, e.SmartCategoryId });

        modelBuilder.Entity<SmartCategoryOrderChannelMapping>()
            .HasKey(e => new { e.SmartCategoryId, e.AccountId, e.OrderChannelId });

        modelBuilder.Entity<SmartCategoryShopDetail>()
            .HasKey(e => new { e.SmartCategoryId, e.AccountId, e.ShopId });

        //modelBuilder.Entity<SmsReportTaskerHeader>()
        //    .HasKey(e => new { e.SmsReportTaskerHeaderId, e.AccountId });

        modelBuilder.Entity<StaffAttendanceDetailOnline>()
            .HasKey(e => new { e.StaffAttendanceDetailId, e.AccountId, e.ShopId });

        modelBuilder.Entity<StaffAttendanceHeaderOnline>()
            .HasKey(e => new { e.StaffAttendanceHeaderId, e.AccountId, e.ShopId });

        //modelBuilder.Entity<StaffMessingAccount>()
        //    .HasKey(e => new { e.StaffMessingAccountId, e.AccountId });

        //modelBuilder.Entity<StaffMessingAccountType>()
        //    .HasKey(e => new { e.StaffMessingAccountTypeId, e.AccountId });

        //modelBuilder.Entity<StockBulkUnitMapping>()
        //    .HasKey(e => new { e.BulkUnitId, e.AccountId });

        //modelBuilder.Entity<StockOrderDetail>()
        //    .HasKey(e => new { e.OrderDetailId, e.AccountId, e.ShopId });

        //modelBuilder.Entity<StockOrderDetailReceiveOnline>()
        //    .HasKey(e => new { e.StockOrderDetailId, e.AccountId, e.ShopId });

        //modelBuilder.Entity<StockOrderHeader>()
        //    .HasKey(e => new { e.OrderHeaderId, e.AccountId });

        //modelBuilder.Entity<StockTakeDetail>()
        //    .HasKey(e => new { e.StockTakeDetailId, e.AccountId, e.ShopId });

        //modelBuilder.Entity<StockTakeHeader>()
        //    .HasKey(e => new { e.StockTakeHeaderId, e.AccountId, e.ShopId });

        //modelBuilder.Entity<SupplierMaster>()
        //    .HasKey(e => new { e.SupplierId, e.AccountId });

        modelBuilder.Entity<SystemParameter>()
            .HasKey(e => new { e.ParamId, e.AccountId });

        modelBuilder.Entity<TableMaster>()
            .HasKey(e => new { e.TableId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TableOrderTokenMapping>()
            .HasKey(e => new { e.TableId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TableSection>()
            .HasKey(e => new { e.SectionId, e.AccountId });

        modelBuilder.Entity<TableSectionShopDetail>()
            .HasKey(e => new { e.SectionId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TableStatus>()
            .HasKey(e => new { e.TableStatusId, e.AccountId });

        modelBuilder.Entity<TableType>()
            .HasKey(e => new { e.TableTypeId, e.AccountId });

        modelBuilder.Entity<Taxation>()
            .HasKey(e => new { e.TaxationId, e.AccountId });

        modelBuilder.Entity<TaxationShopDetail>()
            .HasKey(e => new { e.TaxationId, e.AccountId, e.ShopId });

        modelBuilder.Entity<ThirdPartyMenuItemMappingOnline>()
            .HasKey(e => new { e.OrderChannelId, e.AccountId, e.ShopId, e.ItemId, e.ThirdPartyItemOnlineId, e.ParentItemId, e.ModifierGroupHeaderId });

        modelBuilder.Entity<ThirdPartyReservation>()
            .HasKey(e => new { e.ThirdPartyReservationId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxPayment>()
            .HasKey(e => new { e.TxPaymentId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxReceiptReprintLog>()
            .HasKey(e => new { e.TxReceiptReprintLogId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxSalesAction>()
            .HasKey(e => new { e.ActionId });

        modelBuilder.Entity<TxSalesDeliveryDetail>()
            .HasKey(e => new { e.TxSalesDeliveryDetailId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxSalesDeliveryHeader>()
            .HasKey(e => new { e.TxSalesDeliveryHeaderId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxSalesDeliveryService>()
            .HasKey(e => new { e.TxSalesDeliveryServiceId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxSalesDetail>()
            .HasKey(e => new { e.TxSalesDetailId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxSalesDetailLog>()
            .HasKey(e => new { e.TxSalesDetailLogId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxSalesDetailVariance>()
            .HasKey(e => new { e.TxSalesDetailVarianceId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxSalesHeader>()
            .HasKey(e => new { e.TxSalesHeaderId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxSalesHeaderAddress>()
            .HasKey(e => new { e.TxSalesHeaderId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxSalesHeaderLog>()
            .HasKey(e => new { e.TxSalesHeaderLogId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxSalesHeaderOnlineMeta>()
            .HasKey(e => new { e.TxSalesHeaderOnlineMetaId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxSalesHeaderRevokeLog>()
            .HasKey(e => new { e.TxSalesHeaderRevokeLogId, e.AccountId, e.ShopId });

        //modelBuilder.Entity<TxSalesOfflineCouponDistLog>()
        //    .HasKey(e => new { e.TxSalesOfflineCouponDistLogId, e.AccountId, e.ShopId });

        modelBuilder.Entity<TxSalesParam>()
            .HasKey(e => new { e.AccountId, e.ShopId });

        modelBuilder.Entity<User>()
            .HasKey(e => new { e.UserId, e.AccountId, e.ShopId });

        modelBuilder.Entity<UserGroupDetail>()
            .HasKey(e => new { e.GroupId, e.AccountId, e.ShopId, e.UserId });

        modelBuilder.Entity<UserGroupDetailOnline>()
            .HasKey(e => new { e.GroupId, e.AccountId, e.UserId });

        modelBuilder.Entity<UserGroupHeader>()
            .HasKey(e => new { e.GroupId, e.AccountId });

        modelBuilder.Entity<UserGroupRight>()
            .HasKey(e => new { e.GroupRightId, e.AccountId });

        modelBuilder.Entity<UserGroupRightCode>()
            .HasKey(e => new { e.GroupRightCodeId, e.AccountId });

        modelBuilder.Entity<UserOnlineMeta>()
            .HasKey(e => new { e.UserId, e.AccountId, e.ShopId });

        modelBuilder.Entity<WorkdayPeriodMaster>()
            .HasKey(e => new { e.WorkdayPeriodMasterId, e.AccountId });

        // Identity columns — let SQL Server auto-generate IDs
        modelBuilder.Entity<Shop>()
            .Property(s => s.ShopId)
            .ValueGeneratedOnAdd();
        modelBuilder.Entity<ShopWorkdayHeader>()
            .Property(s => s.WorkdayHeaderId)
            .ValueGeneratedOnAdd();
        modelBuilder.Entity<ShopWorkdayPeriod>()
            .Property(s => s.WorkdayPeriodId)
            .ValueGeneratedOnAdd();
    }

    private static readonly IReadOnlyDictionary<string, string[]> SqlServerTableTriggers = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
    {
        ["AccountMaster"] = new[] { "AccountMaster_delete_trigger", "AccountMaster_insert_trigger", "AccountMaster_update_trigger" },
        ["Address"] = new[] { "Address_delete_trigger", "Address_insert_trigger", "Address_update_trigger" },
        ["AddressBook"] = new[] { "AddressBook_delete_trigger", "AddressBook_insert_trigger", "AddressBook_update_trigger" },
        ["AddressDeliveryMapping"] = new[] { "AddressDeliveryMapping_delete_trigger", "AddressDeliveryMapping_insert_trigger", "AddressDeliveryMapping_update_trigger" },
        ["AddressGroup"] = new[] { "AddressGroup_delete_trigger", "AddressGroup_insert_trigger", "AddressGroup_update_trigger" },
        ["AddressMasterArea"] = new[] { "AddressMasterArea_delete_trigger", "AddressMasterArea_insert_trigger", "AddressMasterArea_update_trigger" },
        ["AddressMasterBuilding"] = new[] { "AddressMasterBuilding_delete_trigger", "AddressMasterBuilding_insert_trigger", "AddressMasterBuilding_update_trigger" },
        ["AddressMasterDistrict"] = new[] { "AddressMasterDistrict_delete_trigger", "AddressMasterDistrict_insert_trigger", "AddressMasterDistrict_update_trigger" },
        ["AddressMasterEstate"] = new[] { "AddressMasterEstate_delete_trigger", "AddressMasterEstate_insert_trigger", "AddressMasterEstate_update_trigger" },
        ["AddressMasterShop"] = new[] { "AddressMasterShop_delete_trigger", "AddressMasterShop_insert_trigger", "AddressMasterShop_update_trigger" },
        ["AddressMasterStreet"] = new[] { "AddressMasterStreet_delete_trigger", "AddressMasterStreet_insert_trigger", "AddressMasterStreet_update_trigger" },
        ["AuditTrailLog"] = new[] { "AuditTrailLog_delete_trigger", "AuditTrailLog_insert_trigger", "AuditTrailLog_update_trigger" },
        ["BundlePromoOverview"] = new[] { "BundlePromoOverview_delete_trigger", "BundlePromoOverview_insert_trigger", "BundlePromoOverview_update_trigger" },
        ["ButtonStyleMaster"] = new[] { "ButtonStyleMaster_delete_trigger", "ButtonStyleMaster_insert_trigger", "ButtonStyleMaster_update_trigger" },
        ["CashDrawerDetail"] = new[] { "CashDrawerDetail_delete_trigger", "CashDrawerDetail_insert_trigger", "CashDrawerDetail_update_trigger" },
        ["CashDrawerHeader"] = new[] { "CashDrawerHeader_delete_trigger", "CashDrawerHeader_insert_trigger", "CashDrawerHeader_update_trigger" },
        ["Coupon"] = new[] { "Coupon_delete_trigger", "Coupon_insert_trigger", "Coupon_update_trigger" },
        ["CouponCampaign"] = new[] { "CouponCampaign_delete_trigger", "CouponCampaign_insert_trigger", "CouponCampaign_update_trigger" },
        ["CouponCampaignDistShopMapping"] = new[] { "CouponCampaignDistShopMapping_delete_trigger", "CouponCampaignDistShopMapping_insert_trigger", "CouponCampaignDistShopMapping_update_trigger" },
        ["CouponCampaignMemberMapping"] = new[] { "CouponCampaignMemberMapping_delete_trigger", "CouponCampaignMemberMapping_insert_trigger", "CouponCampaignMemberMapping_update_trigger" },
        ["CouponCampaignMemberTypeMapping"] = new[] { "CouponCampaignMemberTypeMapping_delete_trigger", "CouponCampaignMemberTypeMapping_insert_trigger", "CouponCampaignMemberTypeMapping_update_trigger" },
        ["CouponCampaignMemberUsedCount"] = new[] { "CouponCampaignMemberUsedCount_delete_trigger", "CouponCampaignMemberUsedCount_insert_trigger", "CouponCampaignMemberUsedCount_update_trigger" },
        ["CouponDistributionLog"] = new[] { "CouponDistributionLog_delete_trigger", "CouponDistributionLog_insert_trigger", "CouponDistributionLog_update_trigger" },
        ["CouponMemberWallet"] = new[] { "CouponMemberWallet_delete_trigger", "CouponMemberWallet_insert_trigger", "CouponMemberWallet_update_trigger" },
        ["CouponRedeemLog"] = new[] { "CouponRedeemLog_delete_trigger", "CouponRedeemLog_insert_trigger", "CouponRedeemLog_update_trigger" },
        ["DbMasterTableTranslation"] = new[] { "DbMasterTableTranslation_delete_trigger", "DbMasterTableTranslation_insert_trigger", "DbMasterTableTranslation_update_trigger" },
        ["Department"] = new[] { "Department_delete_trigger", "Department_insert_trigger", "Department_update_trigger" },
        ["DeviceTerminal"] = new[] { "DeviceTerminal_delete_trigger", "DeviceTerminal_insert_trigger", "DeviceTerminal_update_trigger" },
        ["DeviceTerminalModel"] = new[] { "DeviceTerminalModel_delete_trigger", "DeviceTerminalModel_insert_trigger", "DeviceTerminalModel_update_trigger" },
        ["Discount"] = new[] { "Discount_delete_trigger", "Discount_insert_trigger", "Discount_update_trigger" },
        ["DiscountShopDetail"] = new[] { "DiscountShopDetail_delete_trigger", "DiscountShopDetail_insert_trigger", "DiscountShopDetail_update_trigger" },
        ["ItemCategory"] = new[] { "ItemCategory_delete_trigger", "ItemCategory_insert_trigger", "ItemCategory_update_trigger" },
        ["ItemCategoryShopDetail"] = new[] { "ItemCategoryShopDetail_delete_trigger", "ItemCategoryShopDetail_insert_trigger", "ItemCategoryShopDetail_update_trigger" },
        ["ItemMaster"] = new[] { "ItemMaster_delete_trigger", "ItemMaster_insert_trigger", "ItemMaster_update_trigger" },
        ["ItemMasterGroupRight"] = new[] { "ItemMasterGroupRight_delete_trigger", "ItemMasterGroupRight_insert_trigger", "ItemMasterGroupRight_update_trigger" },
        ["ItemMasterMetaOnline"] = new[] { "ItemMasterMetaOnline_delete_trigger", "ItemMasterMetaOnline_insert_trigger", "ItemMasterMetaOnline_update_trigger" },
        ["ItemModifierGroupMapping"] = new[] { "ItemModifierGroupMapping_delete_trigger", "ItemModifierGroupMapping_insert_trigger", "ItemModifierGroupMapping_update_trigger" },
        ["ItemOrderChannelMapping"] = new[] { "ItemOrderChannelMapping_delete_trigger", "ItemOrderChannelMapping_insert_trigger", "ItemOrderChannelMapping_update_trigger" },
        ["ItemPrice"] = new[] { "ItemPrice_delete_trigger", "ItemPrice_insert_trigger", "ItemPrice_update_trigger" },
        ["ItemPriceRuleGroupMapping"] = new[] { "ItemPriceRuleGroupMapping_delete_trigger", "ItemPriceRuleGroupMapping_insert_trigger", "ItemPriceRuleGroupMapping_update_trigger" },
        ["ItemSOP"] = new[] { "ItemSOP_delete_trigger", "ItemSOP_insert_trigger", "ItemSOP_update_trigger" },
        ["ItemSet"] = new[] { "ItemSet_delete_trigger", "ItemSet_insert_trigger", "ItemSet_update_trigger" },
        ["ItemShopDetail"] = new[] { "ItemShopDetail_delete_trigger", "ItemShopDetail_insert_trigger", "ItemShopDetail_update_trigger" },
        ["ItemShopDetailOnlineMetaData"] = new[] { "ItemShopDetailOnlineMetaData_delete_trigger", "ItemShopDetailOnlineMetaData_insert_trigger", "ItemShopDetailOnlineMetaData_update_trigger" },
        ["ItemSoldOutHistory"] = new[] { "ItemSoldOutHistory_delete_trigger", "ItemSoldOutHistory_insert_trigger", "ItemSoldOutHistory_update_trigger" },
        ["ItemSOPDetail"] = new[] { "ItemSOPDetail_delete_trigger", "ItemSOPDetail_insert_trigger", "ItemSOPDetail_update_trigger" },
        ["KdsTxDetail"] = new[] { "KdsTxDetail_delete_trigger", "KdsTxDetail_insert_trigger", "KdsTxDetail_update_trigger" },
        ["KdsTxHeader"] = new[] { "KdsTxHeader_delete_trigger", "KdsTxHeader_insert_trigger", "KdsTxHeader_update_trigger" },
        ["KdsTxLog"] = new[] { "KdsTxLog_delete_trigger", "KdsTxLog_insert_trigger", "KdsTxLog_update_trigger" },
        ["LoyaltyHeader"] = new[] { "LoyaltyHeader_delete_trigger", "LoyaltyHeader_insert_trigger", "LoyaltyHeader_update_trigger" },
        ["MemberDetail"] = new[] { "MemberDetail_delete_trigger", "MemberDetail_insert_trigger", "MemberDetail_update_trigger" },
        ["MemberHeader"] = new[] { "MemberHeader_delete_trigger", "MemberHeader_insert_trigger", "MemberHeader_update_trigger" },
        ["MemberOnlineDetail"] = new[] { "MemberOnlineDetail_delete_trigger", "MemberOnlineDetail_insert_trigger", "MemberOnlineDetail_update_trigger" },
        ["MenuDetail"] = new[] { "MenuDetail_delete_trigger", "MenuDetail_insert_trigger", "MenuDetail_update_trigger" },
        ["MenuHeader"] = new[] { "MenuHeader_delete_trigger", "MenuHeader_insert_trigger", "MenuHeader_update_trigger" },
        ["MenuHeaderMetaOnline"] = new[] { "MenuHeaderMetaOnline_delete_trigger", "MenuHeaderMetaOnline_insert_trigger", "MenuHeaderMetaOnline_update_trigger" },
        ["MenuShopDetail"] = new[] { "MenuShopDetail_delete_trigger", "MenuShopDetail_insert_trigger", "MenuShopDetail_update_trigger" },
        ["ModifierGroupDetail"] = new[] { "ModifierGroupDetail_delete_trigger", "ModifierGroupDetail_insert_trigger", "ModifierGroupDetail_update_trigger" },
        ["ModifierGroupHeader"] = new[] { "ModifierGroupHeader_delete_trigger", "ModifierGroupHeader_insert_trigger", "ModifierGroupHeader_update_trigger" },
        ["ModifierGroupOnlineDetail"] = new[] { "ModifierGroupOnlineDetail_delete_trigger", "ModifierGroupOnlineDetail_insert_trigger", "ModifierGroupOnlineDetail_update_trigger" },
        ["ModifierGroupShopDetail"] = new[] { "ModifierGroupShopDetail_delete_trigger", "ModifierGroupShopDetail_insert_trigger", "ModifierGroupShopDetail_update_trigger" },
        ["OclClientXFileUpload"] = new[] { "OclClientXFileUpload_delete_trigger", "OclClientXFileUpload_insert_trigger", "OclClientXFileUpload_update_trigger" },
        ["OclServerFileDownload"] = new[] { "OclServerFileDownload_delete_trigger", "OclServerFileDownload_insert_trigger", "OclServerFileDownload_update_trigger" },
        ["PayInOut"] = new[] { "PayInOut_delete_trigger", "PayInOut_insert_trigger", "PayInOut_update_trigger" },
        ["PaymentMethod"] = new[] { "PaymentMethod_delete_trigger", "PaymentMethod_insert_trigger", "PaymentMethod_update_trigger" },
        ["PaymentMethodShopDetail"] = new[] { "PaymentMethodShopDetail_delete_trigger", "PaymentMethodShopDetail_insert_trigger", "PaymentMethodShopDetail_update_trigger" },
        ["PriceRule"] = new[] { "PriceRule_delete_trigger", "PriceRule_insert_trigger", "PriceRule_update_trigger" },
        ["PriceRuleGroup"] = new[] { "PriceRuleGroup_delete_trigger", "PriceRuleGroup_insert_trigger", "PriceRuleGroup_update_trigger" },
        ["PrintDepartmentSlipLog"] = new[] { "PrintDepartmentSlipLog_delete_trigger", "PrintDepartmentSlipLog_insert_trigger", "PrintDepartmentSlipLog_update_trigger" },
        ["PromoDetail"] = new[] { "PromoDetail_delete_trigger", "PromoDetail_insert_trigger", "PromoDetail_update_trigger" },
        ["PromoDetail_tracking"] = new[] { "PromoDetail_tracking_delete_trigger", "PromoDetail_tracking_insert_trigger", "PromoDetail_tracking_update_trigger" },
        ["PromoHeader"] = new[] { "PromoHeader_delete_trigger", "PromoHeader_insert_trigger", "PromoHeader_update_trigger" },
        ["PromoShopDetail"] = new[] { "PromoShopDetail_delete_trigger", "PromoShopDetail_insert_trigger", "PromoShopDetail_update_trigger" },
        ["Reason"] = new[] { "Reason_delete_trigger", "Reason_insert_trigger", "Reason_update_trigger" },
        ["ReasonGroup"] = new[] { "ReasonGroup_delete_trigger", "ReasonGroup_insert_trigger", "ReasonGroup_update_trigger" },
        ["ReportTurnoverDetail"] = new[] { "ReportTurnoverDetail_delete_trigger", "ReportTurnoverDetail_insert_trigger", "ReportTurnoverDetail_update_trigger" },
        ["ReportTurnoverHeader"] = new[] { "ReportTurnoverHeader_delete_trigger", "ReportTurnoverHeader_insert_trigger", "ReportTurnoverHeader_update_trigger" },
        ["RevenueCenterMaster"] = new[] { "RevenueCenterMaster_delete_trigger", "RevenueCenterMaster_insert_trigger", "RevenueCenterMaster_update_trigger" },
        ["Roster"] = new[] { "Roster_delete_trigger", "Roster_insert_trigger", "Roster_update_trigger" },
        ["SelfOrderingMediaMaster"] = new[] { "SelfOrderingMediaMaster_delete_trigger", "SelfOrderingMediaMaster_insert_trigger", "SelfOrderingMediaMaster_update_trigger" },
        ["SelfOrderingMediaShopDetail"] = new[] { "SelfOrderingMediaShopDetail_delete_trigger", "SelfOrderingMediaShopDetail_insert_trigger", "SelfOrderingMediaShopDetail_update_trigger" },
        ["ServiceCharge"] = new[] { "ServiceCharge_delete_trigger", "ServiceCharge_insert_trigger", "ServiceCharge_update_trigger" },
        ["ServiceChargeShopDetail"] = new[] { "ServiceChargeShopDetail_delete_trigger", "ServiceChargeShopDetail_insert_trigger", "ServiceChargeShopDetail_update_trigger" },
        ["Shop"] = new[] { "Shop_delete_trigger", "Shop_insert_trigger", "Shop_update_trigger" },
        ["ShopCodeSettingOnline"] = new[] { "ShopCodeSettingOnline_delete_trigger", "ShopCodeSettingOnline_insert_trigger", "ShopCodeSettingOnline_update_trigger" },
        ["ShopGroupSettingHeader"] = new[] { "ShopGroupSettingHeader_delete_trigger", "ShopGroupSettingHeader_insert_trigger", "ShopGroupSettingHeader_update_trigger" },
        ["ShopPriceRuleMapping"] = new[] { "ShopPriceRuleMapping_delete_trigger", "ShopPriceRuleMapping_insert_trigger", "ShopPriceRuleMapping_update_trigger" },
        ["ShopPrinterMaster"] = new[] { "ShopPrinterMaster_delete_trigger", "ShopPrinterMaster_insert_trigger", "ShopPrinterMaster_update_trigger" },
        ["ShopServiceAreaSetting"] = new[] { "ShopServiceAreaSetting_delete_trigger", "ShopServiceAreaSetting_insert_trigger", "ShopServiceAreaSetting_update_trigger" },
        ["ShopSystemParameter"] = new[] { "ShopSystemParameter_delete_trigger", "ShopSystemParameter_insert_trigger", "ShopSystemParameter_update_trigger" },
        ["ShopTimeSlotDetailOnline"] = new[] { "ShopTimeSlotDetailOnline_delete_trigger", "ShopTimeSlotDetailOnline_insert_trigger", "ShopTimeSlotDetailOnline_update_trigger" },
        ["ShopTimeSlotHeaderOnline"] = new[] { "ShopTimeSlotHeaderOnline_delete_trigger", "ShopTimeSlotHeaderOnline_insert_trigger", "ShopTimeSlotHeaderOnline_update_trigger" },
        ["ShopType"] = new[] { "ShopType_delete_trigger", "ShopType_insert_trigger", "ShopType_update_trigger" },
        ["ShopWorkdayDetail"] = new[] { "ShopWorkdayDetail_delete_trigger", "ShopWorkdayDetail_insert_trigger", "ShopWorkdayDetail_update_trigger" },
        ["ShopWorkdayHeader"] = new[] { "ShopWorkdayHeader_delete_trigger", "ShopWorkdayHeader_insert_trigger", "ShopWorkdayHeader_update_trigger" },
        ["ShopWorkdayHoliday"] = new[] { "ShopWorkdayHoliday_delete_trigger", "ShopWorkdayHoliday_insert_trigger", "ShopWorkdayHoliday_update_trigger" },
        ["ShopWorkdayPeriod"] = new[] { "ShopWorkdayPeriod_delete_trigger", "ShopWorkdayPeriod_insert_trigger", "ShopWorkdayPeriod_update_trigger" },
        ["ShopWorkdayPeriodDetail"] = new[] { "ShopWorkdayPeriodDetail_delete_trigger", "ShopWorkdayPeriodDetail_insert_trigger", "ShopWorkdayPeriodDetail_update_trigger" },
        ["SmartCategory"] = new[] { "SmartCategory_delete_trigger", "SmartCategory_insert_trigger", "SmartCategory_update_trigger" },
        ["SmartCategoryItemDetail"] = new[] { "SmartCategoryItemDetail_delete_trigger", "SmartCategoryItemDetail_insert_trigger", "SmartCategoryItemDetail_update_trigger" },
        ["SmartCategoryOrderChannelMapping"] = new[] { "SmartCategoryOrderChannelMapping_delete_trigger", "SmartCategoryOrderChannelMapping_insert_trigger", "SmartCategoryOrderChannelMapping_update_trigger" },
        ["SmartCategoryShopDetail"] = new[] { "SmartCategoryShopDetail_delete_trigger", "SmartCategoryShopDetail_insert_trigger", "SmartCategoryShopDetail_update_trigger" },
        ["StaffAttendanceDetailOnline"] = new[] { "StaffAttendanceDetailOnline_delete_trigger", "StaffAttendanceDetailOnline_insert_trigger", "StaffAttendanceDetailOnline_update_trigger" },
        ["StaffAttendanceHeaderOnline"] = new[] { "StaffAttendanceHeaderOnline_delete_trigger", "StaffAttendanceHeaderOnline_insert_trigger", "StaffAttendanceHeaderOnline_update_trigger" },
        ["SystemParameter"] = new[] { "SystemParameter_delete_trigger", "SystemParameter_insert_trigger", "SystemParameter_update_trigger" },
        ["TableMaster"] = new[] { "TableMaster_delete_trigger", "TableMaster_insert_trigger", "TableMaster_update_trigger" },
        ["TableOrderTokenMapping"] = new[] { "TableOrderTokenMapping_delete_trigger", "TableOrderTokenMapping_insert_trigger", "TableOrderTokenMapping_update_trigger" },
        ["TableSection"] = new[] { "TableSection_delete_trigger", "TableSection_insert_trigger", "TableSection_update_trigger" },
        ["TableSectionShopDetail"] = new[] { "TableSectionShopDetail_delete_trigger", "TableSectionShopDetail_insert_trigger", "TableSectionShopDetail_update_trigger" },
        ["TableStatus"] = new[] { "TableStatus_delete_trigger", "TableStatus_insert_trigger", "TableStatus_update_trigger" },
        ["TableType"] = new[] { "TableType_delete_trigger", "TableType_insert_trigger", "TableType_update_trigger" },
        ["Taxation"] = new[] { "Taxation_delete_trigger", "Taxation_insert_trigger", "Taxation_update_trigger" },
        ["TaxationShopDetail"] = new[] { "TaxationShopDetail_delete_trigger", "TaxationShopDetail_insert_trigger", "TaxationShopDetail_update_trigger" },
        ["ThirdPartyMenuItemMappingOnline"] = new[] { "ThirdPartyMenuItemMappingOnline_delete_trigger", "ThirdPartyMenuItemMappingOnline_insert_trigger", "ThirdPartyMenuItemMappingOnline_update_trigger" },
        ["ThirdPartyReservation"] = new[] { "ThirdPartyReservation_delete_trigger", "ThirdPartyReservation_insert_trigger", "ThirdPartyReservation_update_trigger" },
        ["TxPayment"] = new[] { "TxPayment_delete_trigger", "TxPayment_insert_trigger", "TxPayment_update_trigger" },
        ["TxReceiptReprintLog"] = new[] { "TxReceiptReprintLog_delete_trigger", "TxReceiptReprintLog_insert_trigger", "TxReceiptReprintLog_update_trigger" },
        ["TxSalesAction"] = new[] { "TxSalesAction_delete_trigger", "TxSalesAction_insert_trigger", "TxSalesAction_update_trigger" },
        ["TxSalesDeliveryDetail"] = new[] { "TxSalesDeliveryDetail_delete_trigger", "TxSalesDeliveryDetail_insert_trigger", "TxSalesDeliveryDetail_update_trigger" },
        ["TxSalesDeliveryHeader"] = new[] { "TxSalesDeliveryHeader_delete_trigger", "TxSalesDeliveryHeader_insert_trigger", "TxSalesDeliveryHeader_update_trigger" },
        ["TxSalesDeliveryService"] = new[] { "TxSalesDeliveryService_delete_trigger", "TxSalesDeliveryService_insert_trigger", "TxSalesDeliveryService_update_trigger" },
        ["TxSalesDetail"] = new[] { "TxSalesDetail_delete_trigger", "TxSalesDetail_insert_trigger", "TxSalesDetail_update_trigger" },
        ["TxSalesDetailLog"] = new[] { "TxSalesDetailLog_delete_trigger", "TxSalesDetailLog_insert_trigger", "TxSalesDetailLog_update_trigger" },
        ["TxSalesDetailVariance"] = new[] { "TxSalesDetailVariance_delete_trigger", "TxSalesDetailVariance_insert_trigger", "TxSalesDetailVariance_update_trigger" },
        ["TxSalesHeader"] = new[] { "TxSalesHeader_delete_trigger", "TxSalesHeader_insert_trigger", "TxSalesHeader_update_trigger" },
        ["TxSalesHeaderAddress"] = new[] { "TxSalesHeaderAddress_delete_trigger", "TxSalesHeaderAddress_insert_trigger", "TxSalesHeaderAddress_update_trigger" },
        ["TxSalesHeaderLog"] = new[] { "TxSalesHeaderLog_delete_trigger", "TxSalesHeaderLog_insert_trigger", "TxSalesHeaderLog_update_trigger" },
        ["TxSalesHeaderRevokeLog"] = new[] { "TxSalesHeaderRevokeLog_delete_trigger", "TxSalesHeaderRevokeLog_insert_trigger", "TxSalesHeaderRevokeLog_update_trigger" },
        ["TxSalesParam"] = new[] { "TxSalesParam_delete_trigger", "TxSalesParam_insert_trigger", "TxSalesParam_update_trigger" },
        ["User"] = new[] { "User_delete_trigger", "User_insert_trigger", "User_update_trigger" },
        ["UserGroupDetail"] = new[] { "UserGroupDetail_delete_trigger", "UserGroupDetail_insert_trigger", "UserGroupDetail_update_trigger" },
        ["UserGroupDetailOnline"] = new[] { "UserGroupDetailOnline_delete_trigger", "UserGroupDetailOnline_insert_trigger", "UserGroupDetailOnline_update_trigger" },
        ["UserGroupHeader"] = new[] { "UserGroupHeader_delete_trigger", "UserGroupHeader_insert_trigger", "UserGroupHeader_update_trigger" },
        ["UserGroupRight"] = new[] { "UserGroupRight_delete_trigger", "UserGroupRight_insert_trigger", "UserGroupRight_update_trigger" },
        ["UserGroupRightCode"] = new[] { "UserGroupRightCode_delete_trigger", "UserGroupRightCode_insert_trigger", "UserGroupRightCode_update_trigger" },
        ["UserOnlineMeta"] = new[] { "UserOnlineMeta_delete_trigger", "UserOnlineMeta_insert_trigger", "UserOnlineMeta_update_trigger" },
        ["WorkdayPeriodMaster"] = new[] { "WorkdayPeriodMaster_delete_trigger", "WorkdayPeriodMaster_insert_trigger", "WorkdayPeriodMaster_update_trigger" },
    };

    private static void ConfigureSqlServerTriggers(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            var clrType = entityType.ClrType;
            if (clrType == null)
            {
                continue;
            }

            var tableName = entityType.GetTableName();
            if (string.IsNullOrWhiteSpace(tableName))
            {
                continue;
            }

            if (!SqlServerTableTriggers.TryGetValue(tableName, out var triggerNames))
            {
                continue;
            }

            modelBuilder.Entity(clrType).ToTable(tb =>
            {
                foreach (var trigger in triggerNames)
                {
                    tb.HasTrigger(trigger);
                }
            });
        }
    }

    private void ApplyDatabaseSpecificConfigurations(ModelBuilder modelBuilder)
    {
        var isPostgreSQL = Database.IsNpgsql();
        
        // Configure string properties with MaxLengthUnlimited attribute
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.PropertyInfo != null)
                {
                    var maxLengthAttr = property.PropertyInfo.GetCustomAttribute<MaxLengthAttribute>();
                    if (maxLengthAttr is MaxLengthUnlimitedAttribute)
                    {
                        if (isPostgreSQL)
                        {
                            // For PostgreSQL, use text type
                            property.SetColumnType("text");
                        }
                        else
                        {
                            // For SQL Server, use nvarchar(max)
                            property.SetColumnType("nvarchar(max)");
                        }
                    }
                }
            }
        }
    }
}
