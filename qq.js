﻿/**
 * 批量下載腾讯漫画的工具。 Download qq comics.
 */

'use strict';

require('./comic loder.js');

// ----------------------------------------------------------------------------

var qq = new CeL.comic.site({
	// recheck:從頭檢測所有作品之所有章節。
	// recheck : true,
	// one_by_one : true,
	base_URL : 'http://ac.qq.com/',

	// allow .jpg without EOI mark.
	// allow_EOI_error : true,
	// 當圖像檔案過小，或是被偵測出非圖像(如不具有EOI)時，依舊強制儲存檔案。
	// skip_error : true,

	// 解析 作品名稱 → 作品id get_work()
	search_URL : function(work_title) {
		return this.base_URL + 'Comic/searchList/search/'
		// e.g., 找不到"隔离带 2"，須找"隔离带"。
		+ encodeURIComponent(work_title.replace(/\s+\d+$/, '')
		// e.g., "Zero -零之镇魂曲-" → "Zero-零之镇魂曲-"
		// e.g., "七公主 第三季" → "七公主第三季"
		.replace(/ /g, ''));
	},
	parse_search_result : function(html) {
		var id_data = CeL.null_Object(),
		// {Array}id_list = [id,id,...]
		id_list = [], matched, PATTERN_work_id =
		//
		/\/comicInfo\/id\/(\d+)(?:" title="([^"]+)")?/g;
		while (matched = PATTERN_work_id.exec(html)) {
			if (!id_list.includes(matched[1] |= 0)) {
				id_list.push(matched[1]);
				id_data[matched[1]] = matched[2] || '';
			}
		}
		return [ id_list, id_data ];
	},
	convert_id : {
		// 今日限免 free today
		// e.g., node qq free
		free : function(callback) {
			var _this = this;
			// http://ac.qq.com/VIP
			CeL.get_URL(this.base_URL + 'VIP', function(XMLHttp) {
				var html = XMLHttp.responseText, matched, PATTERN_work_name =
				//
				/class="in-works-name" title="([^"]+)">/g,
				//
				free_file = _this.main_directory + 'free.json',
				//
				free = CeL.get_JSON(free_file) || CeL.null_Object();
				var id_list = [];
				_this.free_title = CeL.null_Object();
				while (matched = PATTERN_work_name.exec(html)) {
					matched = matched[1];
					id_list.push(matched);
					free[matched] = (new Date).toISOString();
					_this.free_title[matched] = true;
				}
				CeL.log('今日限免: ' + id_list);
				if (id_list.length !== 2) {
					CeL.warn('今日限免作品數在 2017 CE 應該是2，但本次取得' + id_list.length);
				}
				// write cache
				CeL.write_file(free_file, free);
				callback(id_list);
			});
		}
	},
	// id_of_search_result : function(cached_data) { return cached_data; },
	// title_of_search_result : function(data) { return data; },

	// 取得作品的章節資料。 get_work_data()
	work_URL : function(work_id) {
		return this.base_URL + 'Comic/comicInfo/id/' + (work_id | 0);
	},
	parse_work_data : function(html, get_label) {
		var title = get_label(html.between(
				'<h2 class="works-intro-title ui-left">', '</h2>')),
		// work_data={id,title,author,authors,chapter_count,last_update,last_download:{date,chapter}}
		work_data = {
			// 必要屬性：須配合網站平台更改。
			title : title,

			// 選擇性屬性：須配合網站平台更改。
			// e.g., "连载中"
			status : html.between('<label class="works-intro-status">',
					'</label>').trim(),
			author : get_label(html.between('"works-author-name"', '>')
					.between(' title="', '"')),
			authors :
			//
			get_label(html.between('<p class="bear-p-xone">', '</p>')),
			description : html.between('<meta name="Description" content="',
					'"'),
			last_update : get_label(html.between(
					'<span class="ui-pl10 ui-text-gray6">', '</span>'))
		};

		if (title in this.free_title) {
			var base = this.main_directory + 'free' + CeL.env.path_separator,
			// 今日限免作品移至特殊目錄下。
			id = html.between('<div class="works-cover ui-left">', '</a>')
					.between('/ComicView/index/id/', '/cid/');
			CeL.create_directory(base);
			work_data.directory = base + CeL.to_file_name(
			// 允許自訂作品目錄，但須自行escape並添加path_separator。
			id + ' ' + title + '.' + (new Date).format('%Y%2m%2d'))
					+ CeL.env.path_separator;
		}
		return work_data;
	},
	get_chapter_count : function(work_data, html) {
		var matched,
		// [ , chapter_id ]
		PATTERN_chapter_id = /\/cid\/(\d{1,4})/g;
		while (matched = PATTERN_chapter_id.exec(html)) {
			// 取最大者。
			if (work_data.chapter_count < (matched = +matched[1])) {
				work_data.chapter_count = matched;
			}
		}
	},

	// 取得每一個章節的各個影像內容資料。 get_chapter_data()
	chapter_URL : function(work_data, chapter) {
		return this.base_URL + 'ComicView/index/id/' + work_data.id + '/cid/'
				+ chapter;
	},
	parse_chapter_data : function(html, work_data) {
		// decode chapter data
		// modify from
		// http://ac.gtimg.com/media/js/ac.page.chapter.view_v2.3.5.js?v=20160826
		function decode(c) {
			c = c.substring(1);

			var a = "", b, d, h, f, g, e = 0, _keyStr =
			//
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
			//
			;
			for (c = c.replace(/[^A-Za-z0-9\+\/\=]/g, ""); e < c.length;) {
				b = _keyStr.indexOf(c.charAt(e++));
				d = _keyStr.indexOf(c.charAt(e++));
				f = _keyStr.indexOf(c.charAt(e++));
				g = _keyStr.indexOf(c.charAt(e++));
				b = b << 2 | d >> 4;
				d = (d & 15) << 4 | f >> 2;
				h = (f & 3) << 6 | g;
				a += String.fromCharCode(b);
				64 != f && (a += String.fromCharCode(d));
				64 != g && (a += String.fromCharCode(h));
			}
			c = a;
			for (var a = "", b = 0, c1, c2, d = c1 = c2 = 0; b < c.length;) {
				d = c.charCodeAt(b);
				if (128 > d) {
					a += String.fromCharCode(d);
					b++;
				} else if (191 < d && 224 > d) {
					c2 = c.charCodeAt(b + 1);
					a += String.fromCharCode((d & 31) << 6 | c2 & 63);
					b += 2;
				} else {
					c2 = c.charCodeAt(b + 1);
					c3 = c.charCodeAt(b + 2);
					a += String.fromCharCode((d & 15) << 12 | (c2 & 63) << 6
							| c3 & 63);
					b += 3;
				}
			}

			return JSON.parse(a);
		}

		var chapter_data = html.match(/\sDATA\s*=\s*'([^']{9,})'/);
		if (!chapter_data || !(chapter_data = decode(chapter_data[1]))
				|| !chapter_data.picture) {
			return;
		}

		// 設定必要的屬性。
		chapter_data.title = chapter_data.chapter.cTitle;
		// chapter_data.image_count = chapter_data.picture.length;
		chapter_data.image_list = chapter_data.picture;

		chapter_data.limited = !chapter_data.chapter.canRead;

		return chapter_data;
	}
});

// ----------------------------------------------------------------------------

// CeL.set_debug(3);

qq.start(work_id);
