$(document).ready(function(){
	var orderDetails = "";
	var count = 0;
	$(".add-btn").click(function(){
		var item = $(this).find("product");
		var name = item.find(".name").text();
		var price = item.find(".price").text();
		var photo = item.find(".photo").attr("src");
		var order = {
			'name' : name,
			'price': price,
			'photo': photo
		}		
		orderDetails += "," + JSON.stringify(order);
		if(orderDetails.substring(0,1)==",")
			orderDetails = orderDetails.substring(1);
		localStorage.setItem("orderDetails", "["+orderDetails+"]");
		count +=1;
		$("#count").text(count);
	});
});
function Addproduct() {
	
}