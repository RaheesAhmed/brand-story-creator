$(document).ready(function () {
  let submitBtn = document.getElementById("submitBtn");
  let createStoryBtn = document.getElementById("createStoryBtn");

  submitBtn.addEventListener("click", function () {
    submitBtn.style.display = "none";
    createStoryBtn.style.display = "block";
  });
  // Submit the business form and get target audiences
  $("#submitBtn").click(function (event) {
    event.preventDefault();
    var formData = {
      businessName: $("#businessName").val(),
      natureOfBusiness: $("#natureOfBusiness").val(),
      uniqueSellingProposition: $("#uniqueSellingProposition").val(),
      positiveImpact: $("#positiveImpact").val(),
      targetAudience: $("#targetAudience").val(),
      coreValues: $("#coreValues").val(),
      regenerationFocus: $("#regenerationFocus").val(),
      pricingStrategy: $("#pricingStrategy").val(),
    };
    showLoading(true);

    $.ajax({
      type: "POST",
      url: "http://localhost:3000/submit-business-form", // Correct endpoint
      contentType: "application/json",
      data: JSON.stringify(formData),
      success: function (response) {
        console.log("Received Target Audiences: ", response);

        // Join the array elements into a single string and parse it as JSON
        var targetAudiencesString = response.targetAudiences.join("");
        var targetAudiencesData = JSON.parse(targetAudiencesString);

        // Extract the target audiences array from the parsed JSON
        var targetAudiences = targetAudiencesData.targetAudiences;

        // Generate HTML for Bootstrap cards
        var targetAudiencesHtml = '<div class="row">';
        targetAudiences.forEach(function (audience) {
          targetAudiencesHtml += `
<div class="col-md-4">
  <div class="card mb-4 card-custom">
    <div class="card-body">
      <h5 class="card-title">${audience.name}</h5>
      <p class="card-text">${audience.description}</p>
      <button class="btn btn-primary select-audience-btn" data-audience="${audience.description}" style="
        background-color: rgb(15, 15, 15);
        color: white;
        font-weight: 600;
      ">Select</button>
    </div>
  </div>
</div>
`;
        });
        targetAudiencesHtml += "</div>";

        targetAudiencesHtml += "</div>";

        // Display the Bootstrap cards in the targetAudiences div
        $("#targetAudiences").html(targetAudiencesHtml);

        showLoading(false);
      },
      error: function (error) {
        console.error("Error in form submission: ", error);
        $("#brandStory").html(
          "<p>An error occurred while processing your request.</p>"
        );
      },
    });
  });
});

// Create the brand story when the Create Brand Story button is clicked
$("#createStoryBtn").click(function () {
  var businessDetails = {
    businessName: $("#businessName").val(),
    natureOfBusiness: $("#natureOfBusiness").val(),
    uniqueSellingProposition: $("#uniqueSellingProposition").val(),
    positiveImpact: $("#positiveImpact").val(),
    targetAudience: $("#targetAudience").val(),
    coreValues: $("#coreValues").val(),
    regenerationFocus: $("#regenerationFocus").val(),
    pricingStrategy: $("#pricingStrategy").val(),
  };
  var selectedAudience = $("#targetAudience").val();
  generateBrandStory(businessDetails, selectedAudience);
});

function selectTargetAudience(audienceName) {
  $("#targetAudience").val(audienceName);
}

function generateBrandStory(businessDetails, selectedAudience) {
  businessDetails.selectedTargetAudience = selectedAudience;
  showLoading(true);
  $.ajax({
    type: "POST",
    url: "http://localhost:3000/generate-story",
    contentType: "application/json",
    data: JSON.stringify(businessDetails),
    success: function (response) {
      $("#brandStory").html(
        `<p><span style="font-weight:800">Brand Story</span>: ${response.brandStory}</p>`
      );
    },
    error: function (error) {
      console.error("Error:", error);
      $("#brandStory").html(
        "<p>An error occurred while generating the brand story.</p>"
      );
    },
    complete: function () {
      // Hide the loader after the AJAX request completes
      showLoading(false);
    },
  });
}

function showLoading(show) {
  if (show) {
    $("#loadingIndicator").show();
  } else {
    $("#loadingIndicator").hide();
  }
}
