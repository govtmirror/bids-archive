function as(n) {
	var themeUrl = "../ext-3.4.0/resources/css/xtheme-wireframe.css";
	Ext.util.CSS.swapStyleSheet("theme", themeUrl);
};

var initZoom = 0;
var map;

var sd;
var initExtent = new OpenLayers.Bounds([-12100000, -5000000, 15200000, 6000000], true);
var initCenter = [3000000, 1170000];
var store, grid;
var check;
var addForm, editForm;
var addWin, editWin;
var required, banks, regions, stat, arch, sizes, sec;
var sp, pr, co, prt, prn, li, se, ke, prs, pra, br, im, ime, prd, pos, su, subo, sou, fid, ten;
var defaultURL = "http://" + host + "/geoserver/opengeo/ows?service=WFS&version=1.1.0&request=GetFeature&typeName=opengeo%3ADATATABLE";
var searchURL = defaultURL;
var csvURL = "http://" + host + "/geoserver/opengeo/ows?service=WFS&version=1.1.0&request=GetFeature&typeName=opengeo%3ADATATABLE";

// Default filters to apply for CSV export
var defaultFilter = "&Filter=%3CFilter%3E%0A%09%3CAnd%3E%0A%09%09%3COr%3E%0A%09%09%09%3CPropertyIsEqualTo%3E%0A%09%09%09%09%3CPropertyName%3EStatus%3C%2FPropertyName%3E%0A%09%09%09%09%3CLiteral%3EIn%20Procurement%3C%2FLiteral%3E%0A%09%09%09%3C%2FPropertyIsEqualTo%3E%0A%09%09%09%3CPropertyIsEqualTo%3E%0A%09%09%09%09%3CPropertyName%3EStatus%3C%2FPropertyName%3E%0A%09%09%09%09%3CLiteral%3EPipeline%3C%2FLiteral%3E%0A%09%09%09%3C%2FPropertyIsEqualTo%3E%0A%09%09%3C%2FOr%3E%0A%09%09%3CPropertyIsEqualTo%3E%0A%09%09%09%3CPropertyName%3ECleared%3C%2FPropertyName%3E%0A%09%09%09%3CLiteral%3E1%3C%2FLiteral%3E%0A%09%09%3C%2FPropertyIsEqualTo%3E%0A%09%09%3CPropertyIsEqualTo%3E%0A%09%09%09%3CPropertyName%3EArchived%3C%2FPropertyName%3E%0A%09%09%09%3CLiteral%3E0%3C%2FLiteral%3E%0A%09%09%3C%2FPropertyIsEqualTo%3E%0A%09%3C%2FAnd%3E%0A%3C%2FFilter%3E";
var searchFilter = defaultFilter;
var csvFilter = defaultFilter;

Ext.onReady(function() {
	funding = [['Development Banks'], ['Government'], ['Private'], ['Self Financed'], ['Other']]
	sources = [['African Development Bank'], ['Asian Development Bank'], ['European Bank for Reconstruction and Development'], ['Inter-American Development Bank'], ['Post Identified Project'], ['Washington Identified Project'], ['World Bank']]
	regions = [['Africa'], ['East Asia and the Pacific'], ['Europe'], ['Middle East and North Africa'], ['South and Central Asia'], ['Western Hemisphere']]
	stat = [['In Procurement'], ['Pipeline'], ['Fulfilled']]
	arch = [['Active'], ['Archived']]
	sizes = [['Less than $25M'], ['$25-49M'], ['$50-99M'], ['$100M or more']]
	sec = [['Administrative and Support and Waste Management and Remediation Services'],['Agriculture, Forestry, Fishing and Hunting'],['Construction'],['Educational Services'],['Finance and Insurance'],['Health Care and Social Assistance'],['Information'],['Manufacturing'],['Mining, Quarrying, and Oil and Gas Extraction'],['Professional, Scientific, and Technical Services'],['Public Administration'],['Transportation and Warehousing'],['Utilities']]

	var toolbarItems = [];

	var mapPanel = new GeoExt.MapPanel({
		region : "center",
		map : {
			projection : "EPSG:900913",
			maxExtent: new OpenLayers.Bounds(-20000000, -16000000, 20000000, 19000000),
			restrictedExtent: new OpenLayers.Bounds(-20037508.34, -20037508.34,
									 20037508.34, 20037508.34),
			center : initCenter,
			minScale: 110728406.25, /* Zoom Level 2 */
			//minScale: 55468034.09, /* Zoom Level 3 */
			numZoomLevels: 13
		},
		zoom : initZoom,
		layers : [
			new OpenLayers.Layer.Google("Google Streets")
		]
	});

	var info;
	var map = mapPanel.map;

	sd = new OpenLayers.Layer.Vector('lead', {
		strategies : [new OpenLayers.Strategy.Fixed(), new OpenLayers.Strategy.Cluster()],
		styleMap : new OpenLayers.StyleMap({
			'default' : new OpenLayers.Style({
				pointRadius : '${radius}',
				fillOpacity : 0.7,
				fillColor : '#FF6600',
				strokeOpacity : 0.7,
				strokeWidth : 0.5,
				strokeColor : '#A24100'
			}, {
				context : {
					radius : function(feature) {
						return Math.min(feature.attributes.count, 10) * 1.5 + 4;
					}
				}
			}),
			'select' : {
				fillColor : '#FFCC00'
			}
		}),
		protocol : new OpenLayers.Protocol.HTTP({
			url : defaultURL + defaultFilter + "&outputformat=json",
			format : new OpenLayers.Format.GeoJSON()
		}),
		attribution : "<div><div align='right'><a href='http://github.com/USStateDept/bids/wiki/Bug-Reports' target='_blank'><b>Report a bug here</b></a></div><div><disclaimer>Names and boundary representation are not necessarily authoritative.</disclaimer></div>"
	});

	var fpControl = new OpenLayers.Control.FeaturePopups({
		boxSelectionOptions : {},
		layers : [[
		// Uses: Templates for hover & select and safe selection
		sd, {
			templates : {
				// hover single
				hover : '<div class="popupLeadTitle">${.Project_Title}</div><div class="popupLeadDetails"><b>Sector: </b>${.Sector}<br><b>Primary Funding Source: </b>${.Project_Funding_Source}</div>',
				// hover list
				hoverList : '<div class="popupLeadCount">${count} leads found</div><div class="popupLead"><div class="popupLeadList">Click for more information</div></div>',
				// selected item from single & list
				single : '${.popup_HTML}',
				// List of clustered items
				item : '<div class="popupLead"><div class="popupLeadTitle"><leadLink onclick=\"javascript:ga(\'send\', \'event\', \'Pop-Up_Lead_Details\', \'${.Project_Title}_Lead_Details\', {\'nonInteraction\': 1});\" ${showPopup()}>${.Project_Title}</leadLink></div><div class="popupLeadSummary"><b>Country: </b>${.Country}<br><b>Sector: </b>${.Sector}<br><b>Primary Funding Source: </b>${.Project_Funding_Source}</div></div>'
			}
		}]]
	});
	map.addControl(fpControl);

	map.addLayer(sd);

	store = new GeoExt.data.FeatureStore({
		autoSave : true,
		layer : sd,
		fields : [{
			name : "Timestamp",
			type : "string"
		}, {
			name : "Project_Funding_Source",
			type : "string"
		}, {
			name : "Specific_Location",
			type : "string"
		}, {
			name : "Country",
			type : "string"
		}, {
			name : "DOS_Region",
			type : "string"
		}, {
			name : "Project_Title",
			type : "string"
		}, {
			name : "Project_Number",
			type : "string"
		}, {
			name : "Link_To_Project",
			type : "string"
		}, {
			name : "Business_URL",
			type : "string"
		}, {
			name : "Sector",
			type : "string"
		}, {
			name : "Keyword",
			type : "string"
		}, {
			name : "Project_Size",
			type : "integer"
		}, {
			name : "Project_Announced",
			type : "date",
			dateFormat : "Y-m-d\\Z"
		}, {
			name : "Tender_Date",
			type : "date",
			dateFormat : "Y-m-d\\Z"
		}, {
			name : "Borrowing_Entity",
			type : "string"
		}, {
			name : "Implementing_Entity",
			type : "string"
		}, {
			name : "Project_POCs",
			type : "string"
		}, {
			name : "Project_Description",
			type : "string"
		}, {
			name : "Post_Comments",
			type : "string"
		}, {
			name : "Submitting_Officer",
			type : "string"
		}, {
			name : "Submitting_Officer_Contact",
			type : "string"
		}, {
			name : "Source",
			type : "string"
		}, {
			name : "US_Firm_Contact",
			type : "string"
		}, {
			name : "US_Firm_Wins",
			type : "string"
		}, {
			name : "Marker",
			type : "string"
		}, {
			name : "Cleared",
			type : "string"
		}, {
			name : "Status",
			type : "string"
		}, {
			name : "Archived",
			type : "string"
		}, {
			name : "fid",
			type : "string"
		}],
		proxy : new GeoExt.data.ProtocolProxy({
			protocol : new OpenLayers.Protocol.HTTP({
				url : defaultURL + defaultFilter + "&outputformat=json&sortBy=Project_Title+A",
				format : new OpenLayers.Format.GeoJSON()
			})
		})
	});

	store.load();

	grid = new Ext.grid.GridPanel({
		title : "<div style='text-align:center;'><span id='gridTitle'>Business Lead List </span><span id='gridNote'>(click to expand)</span></div>",
		region : "south",
		collapsible : true,
		collapsed : true,
		store : store,
		id : 'gridx',
		plugins : [Ext.ux.PanelCollapsedTitle],
		columns : [{
			header : "Project Title",
			dataIndex : "Project_Title",
			width : 340,
			sortable : true
		}, {
			header : "Country",
			dataIndex : "Country",
			width : 75,
			sortable : true
		}, {
			header : "Sector",
			dataIndex : "Sector",
			width : 125,
			sortable : true
		}, {
			header : "Primary Funding Source",
			dataIndex : "Project_Funding_Source",
			width : 200,
			sortable : true
		}, {
			header : "Project Size",
			dataIndex : "Project_Size",
			renderer : Ext.util.Format.numberRenderer('$0,000'),
			width : 80,
			sortable : true
		}, {
			header : "Project Announced",
			dataIndex : "Project_Announced",
			width : 110,
			format : 'm/d/Y',
			renderer : Ext.util.Format.dateRenderer('m/d/Y'),
			sortable : true
		}, {
			header : "Expected Tender Date",
			dataIndex : "Tender_Date",
			width : 125,
			format : 'm/d/Y',
			renderer : Ext.util.Format.dateRenderer('m/d/Y'),
			sortable : true
		}, {
			header : "Project Number",
			dataIndex : "Project_Number",
			width : 90,
			sortable : true
		}, {
			header : "Keyword",
			dataIndex : "Keyword",
			width : 240,
			sortable : true
		}, {
			header : "Implementing Entity",
			dataIndex : "Implementing_Entity",
			width : 220,
			sortable : true
		}, {
			header : "Status",
			dataIndex : "Status",
			width : 120,
			sortable : true
		}, {
			header : "Archived",
			dataIndex : "Archived",
			renderer: function(dataIndex){
				switch(dataIndex) {
					case '1':
					return 'Archived';
					break;
					case '0':
					return 'Active';
					break;
				}
			},
			width : 80,
			sortable : true
		}, {
			hidden : true,
			header : "Specific Location",
			dataIndex : "Specific_Location",
			width : 175
		}, {
			hidden : true,
			header : "Link to Project",
			dataIndex : "Link_To_Project",
			width : 175
		}, {
			hidden : true,
			header : "Embassy Website",
			dataIndex : "Business_URL",
			width : 175
		}, {
			hidden : true,
			header : "Post Comments",
			dataIndex : "Post_Comments",
			width : 175
		}, {
			hidden : true,
			header : "Submitting Officer",
			dataIndex : "Submitting_Officer",
			width : 175
		}, {
			hidden : true,
			header : "Submitting Officer Contact",
			dataIndex : "Submitting_Officer_Contact",
			width : 175
		}],
		height : 200,
		tbar : [{
			id : 'btnEditEntry',
			text : 'Edit Entry',
			tooltip : 'To Edit, select a lead in the list below, then click this button.',
			icon : 'img/pencil.png',
			handler : function() {
				checkTestEditGrid();
			}
		}, {
			text : 'Export to CSV',
			tooltip : 'Download the list below to a CSV/spreadsheet file.',
			icon : '../img/csv.jpg',
			handler: function() {
				window.location.href = csvURL + csvFilter + '&outputformat=csv';
				ga('send', 'event', 'Export', 'CSV_Export', {'nonInteraction': 1});
			}
		}]
	});

	var enteringHttpProxy = new Ext.data.HttpProxy({
		url : 'servlet/Combo2',
		method : 'GET'
	});

	var regionHttpProxy = new Ext.data.HttpProxy({
		url : 'servlet/Combo2',
		method : 'GET'
	});

	var sectorHttpProxy = new Ext.data.HttpProxy({
		url : 'servlet/Combo2',
		method : 'GET'
	});

	var fundingHttpProxy = new Ext.data.HttpProxy({
		url : 'servlet/Combo2',
		method : 'GET'
	});

	var sourceHttpProxy = new Ext.data.HttpProxy({
		url : 'servlet/Combo2',
		method : 'GET'
	});

	var enteringStore = new Ext.data.Store({
		proxy : enteringHttpProxy,
		baseParams : {
			col : 'Submitting_Officer',
			label : 'EnteringOfficer'
		},

		reader : new Ext.data.XmlReader({
			record : 'Row',
			id : 'ID'
		}, ['EnteringOfficer'])
	});

	var regionStore = new Ext.data.Store({
		proxy : regionHttpProxy,
		baseParams : {
			col : 'DOS_Region',
			label : 'Region'
		},

		reader : new Ext.data.XmlReader({
			record : 'Row',
			id : 'ID'
		}, ['Region'])
	});

	var sectorStore = new Ext.data.Store({
		proxy : sectorHttpProxy,
		baseParams : {
			col : 'Sector',
			label : 'Sector'
		},

		reader : new Ext.data.XmlReader({
			record : 'Row',
			id : 'ID'
		}, ['Sector'])
	});

	var fundingStore = new Ext.data.Store({
		proxy : fundingHttpProxy,
		baseParams : {
			col : 'Project_Funding_Source',
			label : 'FundingSource'
		},

		reader : new Ext.data.XmlReader({
			record : 'Row',
			id : 'ID'
		}, ['FundingSource'])
	});

	var sourceStore = new Ext.data.Store({
		proxy : enteringHttpProxy,
		baseParams : {
			col : 'Source',
			label : 'Source'
		},

		reader : new Ext.data.XmlReader({
			record : 'Row',
			id : 'ID'
		}, ['Source'])
	});

	enteringStore.load();
	sectorStore.load();
	regionStore.load();
	fundingStore.load();

	var categorySelectedId;
	
	// SEARCH FILTERS
	var filterPanel = new Ext.FormPanel({
		labelWidth : 0, // label settings here cascade unless overridden
		frame : false,
		title : '<style="font-size:12px;">Search Filters</style>',
		autoHeight : true,
		region : 'center',
		bodyStyle : 'padding:5px 5px 0',
		defaults : {
			width : 135
		},
		items : [
			txtKey = new Ext.form.TextField({
				emptyText : 'Search for...'
			}), 
			secBox = new Ext.ux.form.CheckboxCombo({
				store : new Ext.data.ArrayStore({
					fields : ['Sector'],
					data : sec
				}),
				displayField : 'Sector',
				valueField : 'Sector',
				mode : 'local',
				emptyText : 'Select Sector...'
			}), sizeBox = new Ext.ux.form.CheckboxCombo({
				store : new Ext.data.ArrayStore({
					fields : ['PrSize'],
					data : sizes
				}),
				displayField : 'PrSize',
				valueField : 'PrSize',
				mode : 'local',
				emptyText : 'Select Size...'
			}), fsBox = new Ext.ux.form.CheckboxCombo({
				store : fundingStore,
				displayField : 'FundingSource',
				valueField : 'FundingSource',
				mode : 'local',
				emptyText : 'Select Funding Source...'
			}), dBegin = new Ext.form.DateField({
				emptyText : 'Announce Date Begin...',
				width : 190
			}), dEnd = new Ext.form.DateField({
				emptyText : 'Announce Date End...',
				width : 190
			}), tBegin = new Ext.form.DateField({
				emptyText : 'Tender Date Begin...',
				width : 190
			}), tEnd = new Ext.form.DateField({
				emptyText : 'Tender Date End...',
				width : 190
			}), statBox = new Ext.ux.form.CheckboxCombo({
				store : new Ext.data.ArrayStore({
					fields : ['Status'],
					data : stat
				}),
				displayField : 'Status',
				valueField : 'Status',
				mode : 'local',
				emptyText : 'Select Status...'
			}), arcBox = new Ext.ux.form.CheckboxCombo({
				store : new Ext.data.ArrayStore({
					fields : ['Archived'],
					data : arch
				}),
				displayField : 'Archived',
				valueField : 'Archived',
				mode : 'local',
				emptyText : 'Select Active...'
			}), {
				region:'center',
				margins: '0 5 5 5',
				width: 190,
				layout:'anchor',
				items:[{
					anchor:'100%',
					baseCls:'x-plain',
					layout:'hbox',
					layoutConfig: {
						padding: '0 0 20 20'
					},
					defaults:{
						margins:'0 20 0 0',
						width: 58,
						pressed: false,
						allowDepress: false
					},
					items: [{
						xtype:'button',
						text : '<div id="resetBtn">Reset</div>',
						id : 'btnResetFilter',
						handler : function() {
							filterPanel.getForm().reset();
	
							var tProxy = new GeoExt.data.ProtocolProxy({
								protocol : new OpenLayers.Protocol.HTTP({
									url : defaultURL + defaultFilter + "&outputformat=json",
									format : new OpenLayers.Format.GeoJSON()
								})
							});
							map.zoomToExtent(initExtent, true);
							map.setCenter(initCenter, initZoom);
	
							store.proxy = tProxy;
							store.reload();
							grid.getView().refresh();
							ga('send', 'event', 'Search_Panel', 'Reset_Search_Panel', {'nonInteraction': 1});
						}
					}, {
						xtype:'button',
						text: '<div id="searchBtn">Search</div>',
						handler: searchFunc
					}]
				}, {
					anchor:'100%',
					baseCls:'x-plain',
					layout:'hbox',
					layoutConfig: {
						padding: '0 0 5 20'
					},
					defaults:{
						margins:'0 5 0 0',
						width: 135,
						pressed: false,
						allowDepress: false
					},
					items: [{
						xtype:'button',
						text: '<div id="addBtn">Add Your Leads!</div>',
						tooltip : 'Access restricted to State Department employees.',
						handler : function() {
							checkTest();
						}
					}]
				}, {
					anchor:'100%',
					baseCls:'x-plain',
					layout:'hbox',
					layoutConfig: {
						padding: '0 0 0 20'
					},
					defaults:{
						margins:'0 5 0 0',
						width: 135,
						pressed: false,
						allowDepress: false
					},
					items: [{
						xtype:'button',
						text : '<div id="editBtn">Edit a Lead</div>',
						handler : function() {
							Ext.getCmp('gridx').getEl().show();
							checkTestEditMap();
						}
					}]
				}]
			}
		]
	});

	// Creates the Layout
	new Ext.Viewport({
		layout : "fit",
		hideBorders : true,
		autoHeight: true,
		autoScroll: false,
		items : {
			layout : "border",
			items : [{
				region : 'north',
				html : '<div id="wrap"><div id="header"><div class="row" style="margin: 0px 0px 0px -100px;"><a class="logo" data-bind="click: showHome" href="index.html"><img id="bidsLogo" alt="BIDS: Business Information Database System, United States Department of State"  src="img/bidsLogo.png"></a><ul class="nav"><li><a href="mailto:BIDS-Mailbox@state.gov">Contact Us</a></li><li><a href="help.html">Help</a></li><li><a href="faqs.html">FAQs</a></li><li><a href="data.html">Data</a></li><li><a href="javascript:checkTest();">Add a Lead</a></li><li><a href="#">Map</a></li><li><a href="index.html">Home</a></li></ul></div></div>',
				height : 101,
				boxMinWidth: 900,
				border : true
			}, mapPanel, {
				layout : 'border',
				region : 'west',
				split : true,
				width : 180,
				items : [filterPanel]
			}, grid]
		}
	});

	Ext.QuickTips.init();
});
