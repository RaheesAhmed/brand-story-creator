$(document).ready(function () {
  // Simplify event listeners for button clicks
  $("#submitBtn").on("click", function () {
    $(this).hide();
    $("#createStoryBtn").show();
  });

  // Function to handle form submission and retrieve target audiences
  function submitBusinessForm() {
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
      url: "http://localhost:3000/submit-business-form",
      contentType: "application/json",
      data: JSON.stringify(formData),
      success: function (response) {
        console.log("Response:", response);
        var targetAudiences = response;
        displayTargetAudiences(targetAudiences);

        showLoading(false);
      },
      error: function (error) {
        console.error("Error in form submission: ", error);
        $("#brandStory").html(
          "<p>An error occurred while processing your request.</p>"
        );
        showLoading(false);
      },
    });
  }

  // Attach the submit action to the form submission event
  $("#submitBtn").click(submitBusinessForm);

  // Handler for "Create Brand Story" button
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
      selectedTargetAudience: $("#targetAudience").val(),
    };
    generateBrandStory(businessDetails);
  });

  // Display target audiences
  function displayTargetAudiences(response) {
    var targetAudiences = response.TargetAudiences;
    var targetAudiencesHtml = '<div class="row">';
    targetAudiences.forEach(function (audience) {
      targetAudiencesHtml += `
      <div class="col-md-4">
        <div class="card mb-4 card-custom">
          <div class="card-body">
            <h5 class="card-title">${audience.Name}</h5>
            <p class="card-text">${audience.Characteristics}</p>
            <button class="btn btn-primary select-audience-btn" data-audience="${
              (audience.Name, audience.Characteristics)
            }" style="
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

    // Display the Bootstrap cards in the targetAudiences div
    $("#targetAudiences").html(targetAudiencesHtml);

    showLoading(false);
  }

  // Alert display function
  function showAlert() {
    alert("Selected...!");
  }

  // Select target audience and show alert
  $(document).on("click", ".select-audience-btn", function () {
    var selectedAudience = $(this).data("audience");
    $("#targetAudience").val(selectedAudience);
    showAlert();
  });

  // Generate the brand story
  function generateBrandStory(businessDetails) {
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
        showLoading(false);
      },
      error: function (error) {
        console.error("Error:", error);
        $("#brandStory").html(
          "<p>An error occurred while generating the brand story.</p>"
        );
        showLoading(false);
      },
    });
  }

  // Show or hide loading indicator
  function showLoading(show) {
    $("#loadingIndicator").toggle(show);
  }
});
