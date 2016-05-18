
/* работа с топиками */

// получить список выделенных раздач
function listSelectedTopics(subsection){
	var topics = [];
	$("#topics_list_"+subsection).closest("div")
	.find("input[type=checkbox]")
	.each(function() {
		if($(this).prop("checked")) {
			id = $(this).attr("id");
			hash = $(this).attr("hash");
			topics.push({id: id, hash: hash});
		}
	});
	return topics;
}

// скачивание т.-файлов выделенных топиков
$("#topics").on("click", ".tor_download", function(){
	subsection = $(this).attr("subsection");	
	topics = listSelectedTopics(subsection);
	if(topics == "") return;	
	$data = $("#config").serialize();
	$.ajax({
		type: "POST",
		url: "index.php",
		data: { topics:topics, m:'download', subsec:subsection, cfg:$data },
		success: function(response) {
			var resp = eval("(" + response + ")");
			$("#log").append(resp.log);
			$("#result_"+subsection).html(resp.dl_log);
		},
		beforeSend: function() {
			block_actions();
			$("#downloading_"+subsection).show();
		},
		complete: function() {
			$("#topics_list_"+subsection).closest("div")
			.find("input[type=checkbox]")
			.each(function() {
			    $(this).removeAttr("checked");
			});
			block_actions();
			$("#downloading_"+subsection).hide();
			$("#log").append(nowTime() + "Скачивание торрент-файлов завершено.<br />");
		},
	});
});

// добавление раздач в торрент-клиент
$("#topics").on("click", ".tor_add", function(){
	subsection = $(this).attr("subsection");
	topics = listSelectedTopics(subsection);
	if(topics == "") return;
	if(!$("#list-ss [value="+subsection+"]").val()){
		$("#result_"+subsection).html("В настройках подразделов нет такого идентификатора: "+subsection+".<br />");
		return;
	}
	ss_data = $("#list-ss [value="+subsection+"]").attr("data");
	tmp = ss_data.split("|");
	if(tmp[2] == "" && tmp[2] == 0){
		$("#result_"+subsection).html("В настройках текущего подраздела не указан используемый торрент-клиент.<br />");
		return;
	}
	if(!$("#list-tcs [value="+tmp[2]+"]").val()){
		$("#result_"+subsection).html("Нет такого торрент-клиента: "+tmp[2]+"<br />");
		return;
	}
	cl_data = $("#list-tcs [value="+tmp[2]+"]").attr("data");
	$data = $("#config").serialize();
	$.ajax({
		type: "POST",
		url: "php/add_topics_to_client.php",
		data: { topics:topics, client:cl_data, subsec:ss_data, cfg:$data },
		success: function(response) {
			var resp = eval("(" + response + ")");
			$("#log").append(resp.log);
			$("#result_"+subsection).html(resp.add_log);
			//~ $("#log").append(response);
			if(resp.success != null){
				// удаляем с главной добавленные раздачи
				for (var i in resp.success) {
					id = resp.success[i];
			        $("#topic_"+id).remove();
		        }
				// помечаем в базе добавленные раздачи
			    $.ajax({
				    type: "POST",
					url: "php/mark_added_topics.php",
					data: { success:resp.success },
					success: function(response) {
						$("#log").append(response);
					},
				});
			}
		},
		beforeSend: function() {
			block_actions();
			$("#adding_"+subsection).show();
		},
		complete: function() {
			block_actions();
			$("#adding_"+subsection).hide();
		},
	});
})

// вывод на экран кол-во, объём выбранных раздач
function showSelectedInfo(subsection, count, size){
	$("#result_"+subsection).html("Выбрано раздач: <span id=\"tp_count_"+subsection+"\" class=\"rp-header\"></span> (<span id=\"tp_size_"+subsection+"\"></span>).");
	$("#tp_count_"+subsection).text(count);
	$("#tp_size_"+subsection).text(сonvertBytes(size));
}

// кнопка выделить все / отменить выделение
$("#topics").on("click", ".tor_select, .tor_unselect", function(){
	action = $(this).attr("action");
	subsection = $(this).attr("subsection");
	count = 0;
	size_all = 0;
	$("#topics_list_"+subsection).closest("div")
	.find("input[type=checkbox]")
	.each(function() {
		switch (action) {
			case "select":
				size = $(this).attr("size");
				$(this).prop("checked", "true");
				size_all += parseInt(size);
				count++;
				break;
			case "unselect":
				$(this).removeAttr("checked");
				break;
		}
	});
	showSelectedInfo(subsection, count, size_all);
});

// выделение/снятие выделения интервала раздач
$("#topics").on("click", ".topic", function(event){
	subsection = $(this).attr("subsection");
	if(!$("#topics_list_"+subsection+" .topic").hasClass("first-topic")){
		$(this).addClass("first-topic");
		return;
	}
	if(event.shiftKey){
		tag = parseInt($(this).attr("tag")); // 2 - 20 = -18; 10 - 2 = 8;
		tag_first = parseInt($("#topics_list_"+subsection+" .first-topic").attr("tag"));
		direction = (tag_first - tag < 0 ? 'down' : 'up');
		$("#topics_list_"+subsection).closest("div")
		.find("input[type=checkbox]")
		.each(function(){
			if(direction == 'down'){
				if(parseInt($(this).attr("tag")) >= tag_first && parseInt($(this).attr("tag")) <= tag){
					if(!event.ctrlKey) $(this).prop("checked", "true");
					else $(this).removeAttr("checked");
				}
			}
			if(direction == 'up'){
				if(parseInt($(this).attr("tag")) <= tag_first && parseInt($(this).attr("tag")) >= tag){
					if(!event.ctrlKey) $(this).prop("checked", "true");
					else $(this).removeAttr("checked");
				}
			}
		});
	}
	$("#topics_list_"+subsection+" .first-topic").removeClass("first-topic");
	$(this).addClass("first-topic");
});

// получение данных о выделенных раздачах (объём, кол-во)
$("#topics").on("click", ".topic", function(){
	subsection = $(this).attr("subsection");
	count = 0;
	size_all = 0;
	$("#topics_list_"+subsection).closest("div")
	.find("input[type=checkbox]")
	.each(function() {
		size = $(this).attr("size");
		if($(this).prop("checked")) {
			count++;
			size_all += parseInt(size);
		}
	});
	showSelectedInfo(subsection, count, size_all);
});

// фильтр

// отобразить/скрыть настройки фильтра
$("#topics").on("click", ".tor_filter", function(){
	if($(this).children("span").hasClass("ui-icon-triangle-1-s"))
		$(this).button({ icons: { primary: "ui-icon-triangle-1-n" }})
			.children("span")
			.css("margin-left", "-2px");
	else
		$(this).button({ icons: { primary: "ui-icon-triangle-1-s" }})
			.children("span")
			.css("margin-left", "-3px");
	tabs = "#"+$(this).parents(".tab-topic").attr("id");
	$(tabs+" .topics_filter").toggle(500);
});

// вкл/выкл интервал сидов
$("#topics").on("click", ".filter_rule input[name=filter_interval]", function(){
	tabs = "#"+$(this).parents(".tab-topic").attr("id");
	$(tabs+" .filter_rule_interval").toggle(500);
	$(tabs+" .filter_rule_one").toggle(500);
});

// получение отфильтрованных раздач из базы
function getFilteredTopics(){
	forum_url = $("#forum_url").val();
	subsec = $(this).parents(".tab-topic").attr("value");
	$data = $("#topics_filter_"+subsec).serialize();
	$.ajax({
		type: "POST",
		url: "php/get_filtered_list_topics.php",
		data: { forum_url:forum_url, subsec:subsec, topics_filter:$data },
		success: function(response) {
			resp = $.parseJSON(response);
			if(resp.topics != null){
				$("#topics_list_"+subsec).html(resp.topics);
			}
			if(resp.log != null){
				$("#topics_list_"+subsec).append(resp.log);
			}
		},
		beforeSend: function() {
			block_actions();
		},
		complete: function() {
			block_actions();
		},
	});
}

// события при выборе свойств фильтра
var delay = makeDelay (500);
$("#topics").on("spin input", ".topics_filter input[type=text]", function(){
	delay (getFilteredTopics, this);
});

$("#topics").on("change", ".topics_filter input[type=radio],[type=checkbox]", function(){
	delay (getFilteredTopics, this);
});
