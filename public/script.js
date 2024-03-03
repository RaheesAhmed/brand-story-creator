$(document).ready(function () {
  let infoText = document.getElementById("info-text");
  var spinner = document.getElementsByClassName("spinner-border");
  let storedBusinessDetails = {};

  // Function to handle form submission and retrieve target audiences
  function submitBusinessForm() {
    var targetAudienceBtn = document.getElementById("submitBtn");

    targetAudienceBtn.innerText = "Generating Target Audiences...";

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
    infoText.innerText = "GENERATING AUDIENCES please wait...";
    showbtnSpinner(true);
    showLoading(true);

    $.ajax({
      type: "POST",
      url: "http://localhost:3000/target-audience",
      contentType: "application/json",
      data: JSON.stringify(formData),
      success: function (response) {
        console.log("Response:", response);
        var targetAudiences = response;
        displayTargetAudiences(targetAudiences);

        targetAudienceBtn.innerText = "Re-generate Target Audiences";
        showbtnSpinner(false);
        showLoading(false);
      },
      error: function (error) {
        console.error("Error in form submission: ", error);
        $("#brandStory").html(
          "<p>An error occurred while processing your request.</p>"
        );
        showLoading(false);
        showbtnSpinner(false);
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
    getBrandStoryPart1(businessDetails);
  });
  //make api call to get the Brnad story Part1
  function getBrandStoryPart1(businessDetails) {
    $("#brandStory").show();
    infoText.innerText = "GENERATING BRAND STORY PART-1 please wait...";
    showLoading(true);
    $.ajax({
      type: "POST",
      url: "http://localhost:3000/brand-story-part1",
      contentType: "application/json",
      data: JSON.stringify(businessDetails),
      success: function (response) {
        console.log("Response:", response);
        displayBrandStoryPart1(response, businessDetails);
        showLoading(false);
      },
      error: function (error) {
        console.error("Error:", error);
        $("#brandStoryPart1").html(
          "<p>An error occurred while fetching the brand story part 1.</p>"
        );
      },
    });
  }

  // Display target audiences
  function displayTargetAudiences(response) {
    console.log("Response in Target :", response);
    var targetAudiences = response.targetAudiences.TargetAudiences;
    var targetAudiencesHtml =
      '<h2 class="card-title" style="text-align:left;padding 10px; color:#2c2b2c">Target Audiences</h2><div class="row">';
    targetAudiences.forEach(function (audience) {
      targetAudiencesHtml += `
      <div class="col-md-4">
        <div class="card mb-4 card-custom fixed">
          <div class="card-body">
            <h5 class="card-title">${audience.Name}</h5>
            <p class="card-text">${audience.Characteristics}</p>
            <button class="btn select-audience-btn" data-audience="${audience.Characteristics}">Select</button>
          </div>
        </div>
      </div>
    `;
    });
    targetAudiencesHtml += "</div>";

    // Display the Bootstrap cards in the targetAudiences div
    $("#targetAudiences").html(targetAudiencesHtml);
    $("#createStoryBtn").show();

    showLoading(false);
  }

  // Alert display function
  function showAlert(message) {
    var alertBox = document.getElementById("customAlert");
    alertBox.innerText = message;
    alertBox.style.display = "block";

    //add fade in and fade out effect
    alertBox.classList.add("fade-in");

    setTimeout(function () {
      alertBox.classList.remove("fade-in");

      alertBox.style.display = "none";
    }, 2000); // Hide after 3 seconds
  }

  // Select target audience and show alert
  $(document).on("click", ".select-audience-btn", function () {
    var selectedAudience = $(this).data("audience");
    $("#targetAudience").val(selectedAudience);
    showAlert("Selected...!");
  });

  function generateBrandStory(businessDetails) {
    storedBusinessDetails = businessDetails;
    $("#brandStory").show();
    infoText.innerText = "GENERATING BRAND STORY please wait...";
    showLoading(true);

    $.ajax({
      type: "POST",
      url: "http://localhost:3000/generate-story",
      contentType: "application/json",
      data: JSON.stringify(businessDetails),
      success: function (response) {
        $("#brandStory").html(
          `<p style="padding:1rem"><span style="font-weight:800; color: #2c2b2c;
          font-size: 2rem;">Brand Story</span></br> ${response.brandStory}</p>
          <div class="icons-container">
          <i class="fa-solid fa-copy" id="copyBtn" style="font-size: 20px; color: #615c61;cursor: pointer;"></i>
          <i class="fa-solid fa-arrows-rotate" id="re-generate" style="font-size: 20px; color: #615c61; cursor: pointer;" ></i>
          </div>
          </br>`
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

  //on re-generate icon click simply call the  /generate-story
  $(document).on("click", "#re-generate", function () {
    generateBrandStory(storedBusinessDetails);
  });

  function displayBrandStoryPart1(response, businessDetails) {
    const target_audience = businessDetails.targetAudience;

    // Check if the response contains the 'response' property
    if (response && response.response) {
      // Parse the JSON response
      const brandStoryPart1 = response.response;

      // Extract the Hero, Villain, and Passion parts
      const hero = brandStoryPart1[0].Hero;
      const villain = brandStoryPart1[1].Villain;
      const passion = brandStoryPart1[2].Passion;

      // Display the brand story part 1 with formatted HTML
      $("#brandStoryPart1").html(
        `<div style="padding:2rem; background: white;" class="card-custom">
          <h2 style="color: #2c2b2c; font-size: 25px;text-align:left;">Part 1: The Hero, Villain, and Passion of Your Brand Story</h2>
          <p><span style="font-weight:800;">Target Audience:</span> ${target_audience}</p>
          <p><span style="font-weight:800;">Hero:</span> ${hero}</p>
          <p><span style="font-weight:800;">Villain:</span> ${villain}</p>
          <p><span style="font-weight:800;">Passion:</span> ${passion}</p>
          <button
            type="button"
            id="createStoryBtnPart2"
            class="btn btn-custom mt-4 text-center align-center py-2 bg-[#b3226aFF]"
            style="
              background-color: rgb(15, 15, 15);
              color: white;
              font-weight: 600;
             
            "
          >
            Create Brand Story Part 2
          </button>
        </div>`
      );
    } else {
      console.error("No response data received for brand story part 1.");
      $("#brandStoryPart1").html(
        "<p>An error occurred while fetching the brand story part 1.</p>"
      );
    }

    showLoading(false);
  }

  // Attach the generate brand story action to the button click event
  $(document).on("click", "#createStoryBtnPart2", function () {
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

  // Copy the brand story to the clipboard
  $(document).on("click", "#copyBtn", function () {
    // Get the brand story text
    const brandStoryText = $("#brandStory").text().trim();

    // Copy the text to the clipboard
    navigator.clipboard
      .writeText(brandStoryText)
      .then(() => {
        // Success message
        $("#copyBtn").html("Copied!");
      })
      .catch((error) => {
        // Error message
        console.error("Error copying text to clipboard: ", error);
        alert("Failed to copy brand story.");
      });
  });

  // Show or hide loading indicator
  function showLoading(show) {
    $("#loadingIndicator").toggle(show);
  }

  function showbtnSpinner(show) {
    $("#spinner-border").toggle(show);
  }
});
