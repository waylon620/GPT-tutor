package controller

import (
	"backend/models"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

func (ops *BaseController) Save_problem(c *gin.Context) {
	var request models.Problem
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON data"})
		return
	}
	log.Println("Valid JSON data")
	res, err := ops.Service.Save_problem(request)
	if err != nil {
		HandleFailedResponse(c, http.StatusBadRequest, err)
	} else {
		HandleSucccessResponse(c, fmt.Sprint(http.StatusOK), res)
	}
}

func (ops *BaseController) Search_problem(c *gin.Context) {
	var request struct {
		Id string `json:"id" bson:"id"`
	}
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON data"})
		return
	}
	log.Println("Valid JSON data")
	log.Print("id: " + request.Id)
	res, err := ops.Service.Search_problem(request.Id)
	if err != nil {
		HandleFailedResponse(c, http.StatusBadRequest, err)
	} else {
		HandleSucccessResponse(c, fmt.Sprint(http.StatusOK), res)
	}
}
